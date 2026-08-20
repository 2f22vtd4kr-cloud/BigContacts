/**
 * Oil-slick / liquid-glass surface for Launch CTA.
 * WebGL iridescent fluid when available; animated canvas-2d fallback otherwise.
 * Tuned to be OBVIOUSLY colorful (gasoline spill), not dark chrome.
 */
import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/** Bright oil-slick: flowing spectrum, strong warp, high contrast */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0.0; float a=0.5;
  for(int i=0;i<6;i++){ v+=a*noise(p); p=p*2.15+vec2(1.7,9.2); a*=0.5; }
  return v;
}

// HSV-ish spectrum for oil film
vec3 oil(float t){
  // cycle: magenta → purple → blue → cyan → lime → gold → magenta
  vec3 c1 = vec3(0.95, 0.15, 0.55);
  vec3 c2 = vec3(0.55, 0.2, 0.95);
  vec3 c3 = vec3(0.15, 0.55, 1.0);
  vec3 c4 = vec3(0.15, 0.95, 0.75);
  vec3 c5 = vec3(0.65, 1.0, 0.2);
  vec3 c6 = vec3(1.0, 0.75, 0.15);
  float x = fract(t);
  if(x < 0.166) return mix(c1, c2, x/0.166);
  if(x < 0.333) return mix(c2, c3, (x-0.166)/0.167);
  if(x < 0.5)   return mix(c3, c4, (x-0.333)/0.167);
  if(x < 0.666) return mix(c4, c5, (x-0.5)/0.166);
  if(x < 0.833) return mix(c5, c6, (x-0.666)/0.167);
  return mix(c6, c1, (x-0.833)/0.167);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.45;

  // Strong liquid domain warp
  vec2 q = p * 3.2;
  q += vec2(
    fbm(q + vec2(t, -t*0.7)),
    fbm(q * 1.3 + vec2(-t*0.6, t*0.9))
  ) * 0.85;
  float n  = fbm(q);
  float n2 = fbm(q * 1.6 - t * 0.3);
  float h  = n * 0.55 + n2 * 0.45;

  // Spectrum phase from height + flow
  float phase = h * 1.8 + t * 0.35 + p.x * 0.4 + p.y * 0.25;
  vec3 slick = oil(phase);

  // Secondary thinner film interference
  float film = sin(h * 18.0 + t * 2.0) * 0.5 + 0.5;
  slick = mix(slick, oil(phase + 0.33), film * 0.45);

  // Specular white streaks (gasoline highlight)
  float hx = fbm(q + vec2(0.03,0.0)) - fbm(q - vec2(0.03,0.0));
  float hy = fbm(q + vec2(0.0,0.03)) - fbm(q - vec2(0.0,0.03));
  vec3 N = normalize(vec3(-hx*5.0, -hy*5.0, 0.45));
  float spec = pow(max(dot(N, normalize(vec3(0.3,0.5,0.9))), 0.0), 32.0);
  slick += vec3(1.0) * spec * 0.85;

  // Keep it bright — darken only slightly toward edges
  float edge = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x)
             * smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
  slick *= 0.55 + 0.45 * edge;

  // Lift floor so it never reads as flat black
  slick = max(slick, vec3(0.08, 0.1, 0.14));
  gl_FragColor = vec4(slick, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    throw new Error("shader");
  }
  return s;
}

/** Canvas2D oil-slick fallback — always visible without WebGL */
function paintFallback(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // cheap flowing noise
      const n =
        Math.sin(u * 8 + t * 1.2 + Math.sin(v * 6 - t)) *
          Math.cos(v * 7 - t * 0.9 + Math.sin(u * 5 + t * 0.7)) *
          0.5 +
        0.5;
      const phase = n * 1.5 + t * 0.25 + u * 0.5;
      const hue = (phase * 360) % 360;
      // HSL → RGB (sat 0.85, light 0.45)
      const s = 0.85;
      const l = 0.42 + n * 0.18;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const hp = hue / 60;
      const x2 = c * (1 - Math.abs((hp % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (hp < 1) { r = c; g = x2; }
      else if (hp < 2) { r = x2; g = c; }
      else if (hp < 3) { g = c; b = x2; }
      else if (hp < 4) { g = x2; b = c; }
      else if (hp < 5) { r = x2; b = c; }
      else { r = c; b = x2; }
      const m = l - c / 2;
      const i = (y * w + x) * 4;
      d[i] = Math.round((r + m) * 255);
      d[i + 1] = Math.round((g + m) * 255);
      d[i + 2] = Math.round((b + m) * 255);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function LiquidMetalSurface({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let dead = false;
    const start = performance.now();

    const tryWebGL = (): boolean => {
      const gl =
        canvas.getContext("webgl", {
          alpha: false,
          antialias: true,
          premultipliedAlpha: false,
          powerPreference: "high-performance",
        }) ||
        (canvas.getContext("experimental-webgl", {
          alpha: false,
          antialias: true,
        }) as WebGLRenderingContext | null);
      if (!gl) return false;
      try {
        const vs = compile(gl, gl.VERTEX_SHADER, VERT);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
        const prog = gl.createProgram()!;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
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
          const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
          const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
          }
        };

        if (reduced) {
          resize();
          gl.uniform2f(uRes, canvas.width, canvas.height);
          gl.uniform1f(uTime, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          return true;
        }

        const frame = (now: number) => {
          if (dead) return;
          resize();
          gl.uniform2f(uRes, canvas.width, canvas.height);
          gl.uniform1f(uTime, (now - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return true;
      } catch {
        return false;
      }
    };

    if (tryWebGL()) {
      return () => {
        dead = true;
        cancelAnimationFrame(raf);
      };
    }

    // 2D fallback — lower res for speed, still colorful
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize2 = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // paint at reduced internal res for perf
      const w = Math.max(2, Math.floor(canvas.clientWidth * Math.min(dpr, 1)));
      const h = Math.max(2, Math.floor(canvas.clientHeight * Math.min(dpr, 1)));
      canvas.width = w;
      canvas.height = h;
    };
    if (reduced) {
      resize2();
      paintFallback(ctx, canvas.width, canvas.height, 0);
      return;
    }
    const frame2 = (now: number) => {
      if (dead) return;
      resize2();
      paintFallback(ctx, canvas.width, canvas.height, (now - start) / 1000);
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
        display: "block",
      }}
    />
  );
}
