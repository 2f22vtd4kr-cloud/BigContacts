/**
 * Non-React oil surface driver — WebGL primary, 2D fallback.
 * Call dispose() on unmount.
 */
import { OIL_FRAG, OIL_VERT } from "./shaders";

export type OilRenderer = {
  dispose: () => void;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function paint2dFallback(
  canvas: HTMLCanvasElement,
  start: number,
  reduced: boolean,
  now: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const t = reduced ? 0.9 : (now - start) / 1000;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const step = w * h > 36_000 ? 2 : 1;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const u = x / w;
      const v = y / h;
      const n =
        Math.sin(u * 2.5 + t * 0.48 + Math.cos(v * 2.1 - t * 0.3)) *
          Math.cos(v * 1.85 - t * 0.24 + Math.sin(u * 1.4 + t * 0.18)) *
          0.5 +
        0.5;
      let r = 8 + n * 22;
      let g = 8 + n * 16;
      let b = 14 + n * 34;
      if (n > 0.32 && n < 0.72) {
        const k = (n - 0.32) / 0.4;
        r += (65 + 45 * Math.sin(t + k * 4)) * k * 0.55;
        g += (30 + 65 * Math.cos(t * 0.8 + k * 3)) * k * 0.55;
        b += (95 + 30 * Math.sin(t * 1.1 + k * 2)) * k * 0.55;
      }
      const mid = 1 - Math.min(1, Math.abs(v - 0.5) * 2.5);
      r *= 1 - mid * 0.28;
      g *= 1 - mid * 0.28;
      b *= 1 - mid * 0.28;
      for (let dy = 0; dy < step && y + dy < h; dy++) {
        for (let dx = 0; dx < step && x + dx < w; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          d[i] = Math.min(255, r | 0);
          d[i + 1] = Math.min(255, g | 0);
          d[i + 2] = Math.min(255, b | 0);
          d[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function createOilRenderer(canvas: HTMLCanvasElement): OilRenderer {
  let raf = 0;
  let dead = false;
  let visible = true;
  let pageVisible = typeof document !== "undefined" ? document.visibilityState !== "hidden" : true;
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
        const on = entries.some((e) => e.isIntersecting);
        visible = on;
        if (on) kick();
      },
      { root: null, threshold: 0.02 },
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

  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: false, /* CTA is small — MSAA cost not worth it */
      premultipliedAlpha: true,
      powerPreference: "low-power",
    }) ||
    (canvas.getContext("experimental-webgl", {
      alpha: true,
      antialias: false,
    }) as WebGLRenderingContext | null);

  let draw: (now: number) => void = (now) => {
    if (dead) return;
    looping = false;
    if (!(visible && pageVisible) && !reduced) return;
    paint2dFallback(canvas, start, reduced, now);
    if (!reduced && visible && pageVisible) {
      looping = true;
      raf = requestAnimationFrame(draw);
    }
  };

  if (gl) {
    try {
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, OIL_VERT);
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, OIL_FRAG);
      gl.compileShader(fs);
      if (
        !gl.getShaderParameter(vs, gl.COMPILE_STATUS) ||
        !gl.getShaderParameter(fs, gl.COMPILE_STATUS)
      ) {
        throw new Error("shader compile");
      }
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const uRes = gl.getUniformLocation(prog, "u_res");
      const uTime = gl.getUniformLocation(prog, "u_time");
      const uMotion = gl.getUniformLocation(prog, "u_motion");
      const uRadius = gl.getUniformLocation(prog, "u_radius");
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      draw = (now: number) => {
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
          gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(uRes, w, h);
        gl.uniform1f(uTime, reduced ? 1.15 : (now - start) / 1000);
        gl.uniform1f(uMotion, reduced ? 0.0 : 1.0);
        gl.uniform1f(uRadius, 0.48);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (!reduced && visible && pageVisible) {
          looping = true;
          raf = requestAnimationFrame(draw);
        }
      };

      cleanups.push(() => {
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      });
    } catch {
      /* keep 2d draw */
    }
  }

  if (reduced) {
    paint2dFallback(canvas, start, true, performance.now());
  } else {
    raf = requestAnimationFrame(draw);
  }

  return {
    dispose: () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
    },
  };
}
