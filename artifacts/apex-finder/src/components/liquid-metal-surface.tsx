/**
 * Launch CTA — AAA oil-slick / iridescent metal surface.
 *
 * Production rules:
 * - WebGL primary; cheap 2D fallback
 * - Pause when off-screen (IntersectionObserver)
 * - prefers-reduced-motion → single static frame
 * - Mid-band slightly darker so DOM label stays readable
 * - No pointer events; canvas is decorative only
 */
import { useEffect, useRef } from "react";

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Low-frequency domain-warped fbm — large oily pools, calm under label */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_motion; /* 0 = static, 1 = full */

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1., 0.));
  float c = hash(i + vec2(0., 1.)), d = hash(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1. - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0., a = 0.55;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 1.9 + vec2(1.7, 3.1);
    a *= 0.48;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.26 * u_motion;

  vec2 q = p * 1.12;
  q += 0.52 * vec2(
    fbm(q + vec2(t * 0.42, -t * 0.3)),
    fbm(q * 0.9 + vec2(-t * 0.36, t * 0.48))
  );
  float h = fbm(q);
  float h2 = fbm(q * 0.72 - t * 0.18);
  float blob = mix(h, h2, 0.38);

  float hx = fbm(q + vec2(0.035, 0.)) - fbm(q - vec2(0.035, 0.));
  float hy = fbm(q + vec2(0., 0.035)) - fbm(q - vec2(0., 0.035));
  vec3 N = normalize(vec3(-hx * 3.0, -hy * 3.0, 0.78));
  float diff = max(dot(N, normalize(vec3(0.2, 0.55, 0.85))), 0.0);
  float spec = pow(max(dot(N, normalize(vec3(0.2, 0.55, 0.85) + vec3(0., 0., 1.))), 0.0), 32.0);

  vec3 col = mix(vec3(0.028, 0.028, 0.045), vec3(0.09, 0.08, 0.13), diff * 0.65 + blob * 0.22);
  col = mix(col, vec3(0.5, 0.54, 0.62), smoothstep(0.48, 0.9, blob) * 0.26);
  col += vec3(spec * 0.85);

  float phase = blob * 2.1 + t * 0.12;
  float f = fract(phase);
  vec3 violet  = vec3(0.52, 0.2, 0.92);
  vec3 magenta = vec3(0.9, 0.26, 0.68);
  vec3 cyan    = vec3(0.22, 0.8, 0.92);
  vec3 blue    = vec3(0.18, 0.38, 0.92);
  vec3 film;
  if (f < 0.25) film = mix(violet, magenta, f / 0.25);
  else if (f < 0.5) film = mix(magenta, cyan, (f - 0.25) / 0.25);
  else if (f < 0.75) film = mix(cyan, blue, (f - 0.5) / 0.25);
  else film = mix(blue, violet, (f - 0.75) / 0.25);

  float mask = smoothstep(0.22, 0.5, blob) * (1.0 - smoothstep(0.68, 0.92, blob));
  mask *= 0.48 + 0.32 * sin(blob * 4.0 + t * 0.8);
  col = mix(col, col * 0.38 + film * 0.78, mask * 0.5);

  float fres = pow(1.0 - max(N.z, 0.0), 2.1);
  col += vec3(0.88, 0.9, 1.0) * fres * 0.2;
  col += violet * fres * 0.12;
  col += cyan * fres * 0.08;

  float edge = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x)
             * smoothstep(0.0, 0.16, uv.y) * smoothstep(1.0, 0.84, uv.y);
  col *= 0.76 + 0.24 * edge;

  /* Deeper oil under the label band — type contrast without a hard strip */
  float mid = 1.0 - smoothstep(0.16, 0.55, abs(uv.y - 0.5));
  col *= 1.0 - mid * 0.24;
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, 1.0);
}
`;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function BaseOilCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let raf = 0;
    let dead = false;
    let visible = true;
    const start = performance.now();
    const reduced = prefersReducedMotion();

    const gl =
      canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        powerPreference: "low-power",
      }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    const cleanupFns: Array<() => void> = [];

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              visible = entries.some((e) => e.isIntersecting);
            },
            { root: null, threshold: 0.01 },
          )
        : null;
    if (io) {
      io.observe(canvas);
      cleanupFns.push(() => io.disconnect());
    }

    const paint2d = (now: number, once: boolean) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const t = reduced ? 0.8 : (now - start) / 1000;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      // Subsample for fallback cost
      const step = w * h > 40_000 ? 2 : 1;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const u = x / w;
          const v = y / h;
          const n =
            Math.sin(u * 2.6 + t * 0.5 + Math.cos(v * 2.0 - t * 0.32)) *
              Math.cos(v * 1.9 - t * 0.26 + Math.sin(u * 1.5 + t * 0.2)) *
              0.5 +
            0.5;
          let r = 10 + n * 24;
          let g = 9 + n * 18;
          let b = 16 + n * 36;
          if (n > 0.3 && n < 0.75) {
            const k = (n - 0.3) / 0.45;
            r += (70 + 50 * Math.sin(t + k * 4)) * k * 0.7;
            g += (35 + 70 * Math.cos(t * 0.8 + k * 3)) * k * 0.7;
            b += (100 + 35 * Math.sin(t * 1.1 + k * 2)) * k * 0.7;
          }
          const mid = 1 - Math.min(1, Math.abs(v - 0.5) * 2.4);
          r *= 1 - mid * 0.2;
          g *= 1 - mid * 0.2;
          b *= 1 - mid * 0.2;
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
      if (!once && !dead && !reduced) {
        raf = requestAnimationFrame((n) => paint2d(n, false));
      }
    };

    if (gl) {
      try {
        const vs = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vs, VERT);
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fs, FRAG);
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

        const draw = (now: number) => {
          if (dead) return;
          if (!visible && !reduced) {
            raf = requestAnimationFrame(draw);
            return;
          }
          const dpr = Math.min(devicePixelRatio || 1, 2);
          const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
          const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
          }
          gl.uniform2f(uRes, w, h);
          gl.uniform1f(uTime, reduced ? 1.2 : (now - start) / 1000);
          gl.uniform1f(uMotion, reduced ? 0.0 : 1.0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          if (!reduced) raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        cleanupFns.push(() => {
          dead = true;
          cancelAnimationFrame(raf);
          gl.deleteProgram(prog);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteBuffer(buf);
        });
        return () => {
          dead = true;
          cleanupFns.forEach((fn) => fn());
        };
      } catch {
        /* 2d fallback */
      }
    }

    paint2d(performance.now(), reduced);
    if (!reduced) {
      raf = requestAnimationFrame((n) => paint2d(n, false));
    }
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: "inherit",
        pointerEvents: "none",
        display: "block",
        zIndex: 0,
      }}
    />
  );
}

export function LiquidMetalSurface({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <BaseOilCanvas />
    </div>
  );
}
