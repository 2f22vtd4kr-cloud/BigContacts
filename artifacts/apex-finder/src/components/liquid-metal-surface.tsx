/**
 * Launch CTA — AAA oil-slick / iridescent metal surface.
 *
 * Production standard:
 * - Dual domain-warped fbm + dual-light film lighting
 * - Soft SDF-style pill edge (matches rounded CTA)
 * - Mid-band slightly deeper so DOM label stays legible
 * - WebGL primary; cheap 2D fallback
 * - Pause off-screen + when tab hidden
 * - Cap ~30fps; prefers-reduced-motion → one static frame
 * - Decorative only (pointer-events: none)
 */
import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * Domain warp: q = p + A * n(p + ωt); sample height at q.
 * Film iridescence from phase(blob); specular from analytic normals.
 * Label band: darker horizontal mid so CSS type reads cleanly.
 */
const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_motion; /* 0 static, 1 full */
uniform float u_radius; /* pill radius in UV units ~0.45 */

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

/* 4 octaves, slight rotation — large oily structure */
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p * 2.02 + vec2(1.7, 3.1);
    a *= 0.5;
  }
  return v;
}

/* Soft rounded-rect SDF in UV space (0..1) */
float sdRoundBox(vec2 uv, vec2 halfSize, float r) {
  vec2 q = abs(uv - 0.5) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.24 * u_motion;

  /* —— Dual domain warp (gasoline-spill scale) —— */
  vec2 q = p * 1.08;
  vec2 w1 = vec2(
    fbm(q + vec2(t * 0.41, -t * 0.29)),
    fbm(q * 0.92 + vec2(-t * 0.33, t * 0.47))
  );
  q += 0.48 * w1;
  vec2 w2 = vec2(
    fbm(q * 1.1 + vec2(t * 0.19, t * 0.27)),
    fbm(q * 0.85 - vec2(t * 0.22, -t * 0.31))
  );
  q += 0.28 * w2;

  float h1 = fbm(q);
  float h2 = fbm(q * 0.7 - t * 0.16 + 3.1);
  float blob = mix(h1, h2, 0.36);

  /* Analytic-ish normals from height */
  float e = 0.032;
  float hx = fbm(q + vec2(e, 0.0)) - fbm(q - vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e)) - fbm(q - vec2(0.0, e));
  vec3 N = normalize(vec3(-hx * 2.8, -hy * 2.8, 0.82));

  /* Dual lights — key + cool rim */
  vec3 L1 = normalize(vec3(0.25, 0.55, 0.8));
  vec3 L2 = normalize(vec3(-0.5, 0.15, 0.7));
  float diff1 = max(dot(N, L1), 0.0);
  float diff2 = max(dot(N, L2), 0.0) * 0.45;
  vec3 H1 = normalize(L1 + vec3(0.0, 0.0, 1.0));
  float spec1 = pow(max(dot(N, H1), 0.0), 40.0);
  float spec2 = pow(max(dot(N, normalize(L2 + vec3(0.0, 0.0, 1.0))), 0.0), 24.0) * 0.35;

  /* Deep cool oil base */
  vec3 col = mix(vec3(0.022, 0.022, 0.038), vec3(0.085, 0.078, 0.12), diff1 * 0.55 + diff2 + blob * 0.2);
  col = mix(col, vec3(0.48, 0.52, 0.6), smoothstep(0.5, 0.92, blob) * 0.22);
  col += vec3(spec1 * 0.9 + spec2 * 0.5);

  /* Iridescent thin-film — phase from warped height */
  float phase = blob * 2.05 + t * 0.11 + w1.x * 0.15;
  float f = fract(phase);
  vec3 violet  = vec3(0.5, 0.18, 0.9);
  vec3 magenta = vec3(0.88, 0.24, 0.66);
  vec3 cyan    = vec3(0.2, 0.78, 0.9);
  vec3 blue    = vec3(0.16, 0.36, 0.9);
  vec3 film;
  if (f < 0.25) film = mix(violet, magenta, f / 0.25);
  else if (f < 0.5) film = mix(magenta, cyan, (f - 0.25) / 0.25);
  else if (f < 0.75) film = mix(cyan, blue, (f - 0.5) / 0.25);
  else film = mix(blue, violet, (f - 0.75) / 0.25);

  float filmMask = smoothstep(0.24, 0.52, blob) * (1.0 - smoothstep(0.66, 0.94, blob));
  filmMask *= 0.45 + 0.28 * sin(blob * 3.8 + t * 0.75);
  /* Keep film moderate — label must win contrast */
  col = mix(col, col * 0.4 + film * 0.72, filmMask * 0.48);

  /* Fresnel rim */
  float fres = pow(1.0 - max(N.z, 0.0), 2.2);
  col += vec3(0.9, 0.92, 1.0) * fres * 0.18;
  col += violet * fres * 0.1;
  col += cyan * fres * 0.07;

  /* Soft UV vignette */
  float vig = smoothstep(0.0, 0.14, uv.x) * smoothstep(1.0, 0.86, uv.x)
            * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
  col *= 0.74 + 0.26 * vig;

  /* Horizontal band under CTA type — deeper oil, no hard strip */
  float mid = 1.0 - smoothstep(0.14, 0.56, abs(uv.y - 0.5));
  col *= 1.0 - mid * 0.26;

  /* SDF pill edge — soft AA matching rounded button */
  float rr = max(u_radius, 0.35);
  vec2 halfSz = vec2(0.5 - 0.02 / aspect, 0.5 - 0.04);
  float d = sdRoundBox(uv, halfSz, rr * 0.5);
  float aa = fwidth(d) * 1.25;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  /* Slight darken at rim for metal thickness */
  col *= mix(0.88, 1.0, smoothstep(0.0, 0.04, -d));

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
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
    let pageVisible = typeof document !== "undefined" ? document.visibilityState !== "hidden" : true;
    const start = performance.now();
    const reduced = prefersReducedMotion();
    let lastFrame = 0;
    const frameInterval = 1000 / 30; // ~30fps budget

    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        powerPreference: "low-power",
      }) ||
      (canvas.getContext("experimental-webgl", {
        alpha: true,
        antialias: true,
      }) as WebGLRenderingContext | null);

    const cleanupFns: Array<() => void> = [];

    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries.some((e) => e.isIntersecting);
        },
        { root: null, threshold: 0.02 },
      );
      io.observe(canvas);
      cleanupFns.push(() => io.disconnect());
    }

    const onVis = () => {
      pageVisible = document.visibilityState !== "hidden";
    };
    document.addEventListener("visibilitychange", onVis);
    cleanupFns.push(() => document.removeEventListener("visibilitychange", onVis));

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
        const uRadius = gl.getUniformLocation(prog, "u_radius");

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const draw = (now: number) => {
          if (dead) return;
          const active = visible && pageVisible;
          if (!active && !reduced) {
            raf = requestAnimationFrame(draw);
            return;
          }
          if (!reduced && now - lastFrame < frameInterval) {
            raf = requestAnimationFrame(draw);
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
      className="pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]"
      aria-hidden
      style={{ zIndex: 0 }}
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
