/**
 * Oil-on-chrome surface for Launch CTA.
 * Organic blotchy film (not rainbow stripes) + specular, WebGL + canvas2d fallback.
 */
import { useEffect, useRef } from "react";

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v=0., a=0.5;
  for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.1+vec2(1.3,4.7); a*=0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.28;

  // Organic domain warp (slow liquid crawl)
  vec2 q = p * 2.4;
  q += 0.55 * vec2(
    fbm(q + vec2(t*0.6, -t*0.4)),
    fbm(q*1.15 + vec2(-t*0.5, t*0.7))
  );
  float n  = fbm(q);
  float n2 = fbm(q*1.7 - t*0.2);
  float h  = mix(n, n2, 0.4);

  // Soft normals from height
  float hx = fbm(q+vec2(0.025,0.)) - fbm(q-vec2(0.025,0.));
  float hy = fbm(q+vec2(0.,0.025)) - fbm(q-vec2(0.,0.025));
  vec3 N = normalize(vec3(-hx*6., -hy*6., 0.55));
  vec3 L = normalize(vec3(0.35, 0.6, 0.85));
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, normalize(L+vec3(0.,0.,1.))), 0.0), 40.0);

  // Dark chrome base
  vec3 dark = vec3(0.07, 0.08, 0.11);
  vec3 mid  = vec3(0.22, 0.26, 0.32);
  vec3 hi   = vec3(0.78, 0.82, 0.88);
  vec3 col  = mix(dark, mid, diff * 0.85 + h * 0.25);
  col = mix(col, hi, smoothstep(0.55, 0.95, h) * 0.35);
  col += vec3(spec * 1.1);

  // Thin-film iridescence — soft, blotchy, not striped
  // phase driven by height + slow time so colors pool organically
  float phase = h * 3.2 + t * 0.15;
  // muted oil film palette (not neon)
  vec3 filmA = vec3(0.55, 0.25, 0.75); // purple
  vec3 filmB = vec3(0.15, 0.55, 0.85); // blue-cyan
  vec3 filmC = vec3(0.35, 0.75, 0.45); // green
  vec3 filmD = vec3(0.75, 0.45, 0.2);  // amber
  float f = fract(phase);
  vec3 film;
  if (f < 0.25) film = mix(filmA, filmB, f/0.25);
  else if (f < 0.5) film = mix(filmB, filmC, (f-0.25)/0.25);
  else if (f < 0.75) film = mix(filmC, filmD, (f-0.5)/0.25);
  else film = mix(filmD, filmA, (f-0.75)/0.25);

  // Only show film where the surface is mid-tone (oil pools), not everywhere
  float filmMask = smoothstep(0.25, 0.55, h) * (1.0 - smoothstep(0.7, 0.95, h));
  filmMask *= 0.55 + 0.45 * sin(h * 9.0 + t);
  col = mix(col, col + film * 0.7, filmMask * 0.65);

  // Fresnel edge glow (white/purple rim energy)
  float fres = pow(1.0 - max(N.z, 0.0), 2.4);
  col += vec3(0.7, 0.75, 0.95) * fres * 0.35;
  col += film * fres * 0.2;

  // Soft edge vignette
  float edge = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x)
             * smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
  col *= 0.7 + 0.3 * edge;

  gl_FragColor = vec4(col, 1.0);
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

function paintFallback(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // organic blotches — dark chrome + soft purple/cyan pools
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const n1 = Math.sin(u * 5.5 + t * 0.8 + Math.cos(v * 4 - t * 0.5));
      const n2 = Math.cos(v * 6.2 - t * 0.6 + Math.sin(u * 3.5 + t * 0.4));
      const n = (n1 * n2) * 0.5 + 0.5;
      // base dark metal
      let r = 18 + n * 40;
      let g = 20 + n * 45;
      let b = 28 + n * 55;
      // soft film pools
      if (n > 0.4 && n < 0.75) {
        const k = (n - 0.4) / 0.35;
        r += 90 * k * (0.6 + 0.4 * Math.sin(t + u * 4));
        g += 40 * k;
        b += 120 * k * (0.5 + 0.5 * Math.cos(t * 0.7 + v * 3));
      }
      // specular streak
      const spec = Math.max(0, 1 - Math.abs(v - 0.35 - Math.sin(u * 2 + t) * 0.08) * 8);
      r += spec * 140;
      g += spec * 150;
      b += spec * 160;
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, r | 0);
      d[i + 1] = Math.min(255, g | 0);
      d[i + 2] = Math.min(255, b | 0);
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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize2 = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
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
