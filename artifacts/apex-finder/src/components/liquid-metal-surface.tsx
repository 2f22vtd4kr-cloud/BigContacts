/**
 * Liquid metal surface — WebGL fragment shader (noise + specular chrome).
 * Used under Launch Atlas primary/reactor CTAs. Falls back to CSS if WebGL fails.
 */
import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Liquid chrome: fbm noise, flowing UV, specular + chromatic fringe
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  // aspect-correct
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);

  float t = u_time * 0.35;

  // Flowing liquid field
  vec2 q = p * 2.8;
  q.x += fbm(q + t) * 0.55;
  q.y += fbm(q * 1.3 - t * 0.8) * 0.45;
  float n = fbm(q + vec2(t * 0.2, -t * 0.15));
  float n2 = fbm(q * 1.7 - t * 0.25);

  // Height / normal-ish from noise derivatives
  float h = n * 0.65 + n2 * 0.35;
  float hx = fbm(q + vec2(0.02, 0.0)) - fbm(q - vec2(0.02, 0.0));
  float hy = fbm(q + vec2(0.0, 0.02)) - fbm(q - vec2(0.0, 0.02));
  vec3 N = normalize(vec3(-hx * 4.0, -hy * 4.0, 0.55));

  // Light
  vec3 L = normalize(vec3(0.4, 0.55, 0.85));
  float diff = max(dot(N, L), 0.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), 48.0);

  // Chrome base (dark metal → bright specular)
  vec3 dark = vec3(0.06, 0.07, 0.09);
  vec3 mid  = vec3(0.28, 0.32, 0.38);
  vec3 hi   = vec3(0.92, 0.94, 0.98);
  vec3 col = mix(dark, mid, diff);
  col = mix(col, hi, smoothstep(0.55, 1.0, h) * 0.35);
  col += vec3(spec * 1.35);

  // Iridescent fringe (purple / cyan / lime) driven by view-ish angle
  float fres = pow(1.0 - max(N.z, 0.0), 2.2);
  vec3 irid = vec3(
    0.55 + 0.45 * sin(h * 6.0 + t),
    0.35 + 0.5 * sin(h * 5.0 + t * 1.3 + 2.0),
    0.65 + 0.35 * sin(h * 4.0 - t * 0.9 + 4.0)
  );
  // brand lime in the mix
  irid = mix(irid, vec3(0.55, 1.0, 0.15), 0.15 + 0.2 * sin(t + h * 3.0));
  col += irid * fres * 0.55;

  // Soft vignette toward pill edges (handled by CSS mask mostly)
  float edge = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x)
             * smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.75, uv.y);
  col *= 0.75 + 0.25 * edge;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(err || "shader compile failed");
  }
  return s;
}

export function LiquidMetalSurface({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    let prog: WebGLProgram | null = null;
    let raf = 0;
    let start = performance.now();
    let dead = false;

    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) || "link failed");
      }
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

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      };

      const frame = (now: number) => {
        if (dead) return;
        resize();
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    } catch {
      // leave canvas blank — CSS fallback under it
      return;
    }

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      if (prog) gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        borderRadius: "inherit",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
