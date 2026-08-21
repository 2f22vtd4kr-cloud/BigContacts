/**
 * Launch CTA — large-scale gasoline / oil-slick surface.
 * Broad slow waves, app lime (#9CFF1A) iridescence, no micro-noise grain.
 */
import { useEffect, useRef } from "react";

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/** Low-frequency domain-warped fbm — big oily pools, not fine sparkle */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

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
/* 3 octaves only — keeps forms large */
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
  /* aspect-correct, large feature size */
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.28;

  /* slow, wide domain warp — gasoline spill scale */
  vec2 q = p * 1.15;
  q += 0.55 * vec2(
    fbm(q + vec2(t * 0.45, -t * 0.32)),
    fbm(q * 0.9 + vec2(-t * 0.38, t * 0.5))
  );
  float h = fbm(q);
  float h2 = fbm(q * 0.7 - t * 0.2);
  float blob = mix(h, h2, 0.4);

  /* soft normals from large gradients */
  float hx = fbm(q + vec2(0.04, 0.)) - fbm(q - vec2(0.04, 0.));
  float hy = fbm(q + vec2(0., 0.04)) - fbm(q - vec2(0., 0.04));
  vec3 N = normalize(vec3(-hx * 3.2, -hy * 3.2, 0.72));
  float diff = max(dot(N, normalize(vec3(0.2, 0.6, 0.85))), 0.0);
  float spec = pow(max(dot(N, normalize(vec3(0.2, 0.6, 0.85) + vec3(0., 0., 1.))), 0.0), 28.0);

  /* deep oil base */
  vec3 col = mix(vec3(0.04, 0.07, 0.05), vec3(0.12, 0.18, 0.12), diff * 0.7 + blob * 0.25);

  /* broad chrome highlight band */
  col = mix(col, vec3(0.55, 0.72, 0.48), smoothstep(0.45, 0.88, blob) * 0.35);
  col += vec3(spec * 0.9);

  /* app lime gasoline film — large phase, not rainbow stripes */
  float phase = blob * 2.0 + t * 0.12;
  float f = fract(phase);
  vec3 lime   = vec3(0.61, 1.0, 0.10);   /* #9CFF1A-ish */
  vec3 deepG  = vec3(0.12, 0.35, 0.08);
  vec3 amber  = vec3(0.45, 0.55, 0.12);
  vec3 film = f < 0.45
    ? mix(deepG, lime, f / 0.45)
    : mix(lime, amber, (f - 0.45) / 0.55);

  float mask = smoothstep(0.22, 0.48, blob) * (1.0 - smoothstep(0.72, 0.95, blob));
  mask *= 0.55 + 0.45 * sin(blob * 4.5 + t * 0.9);
  col = mix(col, col * 0.35 + film * 0.95, mask * 0.72);

  /* soft fresnel with green edge */
  float fres = pow(1.0 - max(N.z, 0.0), 2.0);
  col += lime * fres * 0.22;
  col += vec3(0.2, 0.25, 0.18) * fres * 0.15;

  /* gentle vignette so text stays readable in center */
  float edge = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x)
             * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
  col *= 0.72 + 0.28 * edge;
  /* darken mid band slightly for label contrast */
  float mid = 1.0 - smoothstep(0.25, 0.5, abs(uv.y - 0.5));
  col *= 1.0 - mid * 0.18;

  gl_FragColor = vec4(col, 1.0);
}
`;

function BaseOilCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0;
    let dead = false;
    const start = performance.now();
    const gl =
      canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
      }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

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
          throw new Error("sh");
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
        const frame = (now: number) => {
          if (dead) return;
          const dpr = Math.min(devicePixelRatio || 1, 2);
          const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
          const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
          }
          gl.uniform2f(uRes, w, h);
          gl.uniform1f(uTime, (now - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => {
          dead = true;
          cancelAnimationFrame(raf);
        };
      } catch {
        /* fall through to 2d */
      }
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frame2 = (now: number) => {
      if (dead) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      const t = (now - start) / 1000;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const v = y / h;
          /* large waves only */
          const n =
            Math.sin(u * 2.8 + t * 0.55 + Math.cos(v * 2.2 - t * 0.35)) *
              Math.cos(v * 2.0 - t * 0.28 + Math.sin(u * 1.6 + t * 0.22)) *
              0.5 +
            0.5;
          let r = 10 + n * 30;
          let g = 18 + n * 55;
          let b = 12 + n * 28;
          if (n > 0.28 && n < 0.78) {
            const k = (n - 0.28) / 0.5;
            r += 40 * k;
            g += 140 * k;
            b += 20 * k;
          }
          const spec = Math.max(
            0,
            1 - Math.abs(v - 0.4 - Math.sin(u * 1.4 + t * 0.4) * 0.12) * 6,
          );
          r += spec * 90;
          g += spec * 140;
          b += spec * 70;
          const i = (y * w + x) * 4;
          d[i] = Math.min(255, r | 0);
          d[i + 1] = Math.min(255, g | 0);
          d[i + 2] = Math.min(255, b | 0);
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(frame2);
    };
    raf = requestAnimationFrame(frame2);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
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
