/**
 * WebGPU oil underlay — used when navigator.gpu is available.
 * Same sleep/wake / 30fps / reduced-motion contract as WebGL path.
 */
import { OIL_WGSL } from "./shaders-wgsl";
import type { OilRenderer } from "./create-oil-renderer";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function tryCreateOilRendererWebGPU(
  canvas: HTMLCanvasElement,
): Promise<OilRenderer | null> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (!gpu) return null;

  let adapter: GPUAdapter | null = null;
  try {
    adapter = await gpu.requestAdapter({ powerPreference: "low-power" });
  } catch {
    return null;
  }
  if (!adapter) return null;

  let device: GPUDevice;
  try {
    device = await adapter.requestDevice();
  } catch {
    return null;
  }

  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) {
    device.destroy();
    return null;
  }

  const format = gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "premultiplied",
  });

  const shaderModule = device.createShaderModule({ code: OIL_WGSL });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: shaderModule, entryPoint: "vs_main" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });

  /* res.xy, time, motion, radius, pad — 6 × f32 = 24 bytes, align 32 */
  const uniformBuffer = device.createBuffer({
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  let raf = 0;
  let dead = false;
  let visible = true;
  let pageVisible = document.visibilityState !== "hidden";
  let looping = false;
  let lastFrame = 0;
  const start = performance.now();
  const reduced = prefersReducedMotion();
  const frameInterval = 1000 / 30;
  const cleanups: Array<() => void> = [];

  const kick = () => {
    if (dead || reduced) return;
    if (document.visibilityState === "hidden") return;
    if (!looping) {
      looping = true;
      raf = requestAnimationFrame(draw);
    }
  };

  const onVis = () => {
    pageVisible = document.visibilityState !== "hidden";
    if (pageVisible) kick();
  };
  document.addEventListener("visibilitychange", onVis);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVis));

  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible) kick();
      },
      { threshold: 0.02 },
    );
    io.observe(canvas);
    cleanups.push(() => io.disconnect());
  }

  let resizeT: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(() => kick(), 80);
  };
  window.addEventListener("resize", onResize);
  cleanups.push(() => {
    window.removeEventListener("resize", onResize);
    if (resizeT) clearTimeout(resizeT);
  });

  const writeUniforms = (w: number, h: number, now: number) => {
    const data = new Float32Array(8);
    data[0] = w;
    data[1] = h;
    data[2] = reduced ? 1.15 : (now - start) / 1000;
    data[3] = reduced ? 0 : 1;
    data[4] = 0.48;
    data[5] = 0;
    data[6] = 0;
    data[7] = 0;
    device.queue.writeBuffer(uniformBuffer, 0, data);
  };

  const draw = (now: number) => {
    if (dead) return;
    looping = false;
    const active = visible && pageVisible;
    if (!active && !reduced) return;
    if (!reduced && now - lastFrame < frameInterval) {
      if (!looping) {
        looping = true;
        raf = requestAnimationFrame(draw);
      }
      return;
    }
    lastFrame = now;

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      context.configure({
        device,
        format,
        alphaMode: "premultiplied",
      });
    }

    writeUniforms(w, h, now);
    const textureView = context.getCurrentTexture().createView();
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);

    if (!reduced && visible && pageVisible) {
      looping = true;
      raf = requestAnimationFrame(draw);
    }
  };

  if (reduced) {
    draw(performance.now());
  } else {
    raf = requestAnimationFrame(draw);
  }

  return {
    dispose: () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      try {
        uniformBuffer.destroy();
        device.destroy();
      } catch {
        /* ignore */
      }
    },
  };
}
