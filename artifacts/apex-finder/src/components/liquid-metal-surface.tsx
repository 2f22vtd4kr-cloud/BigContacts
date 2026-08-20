/**
 * Launch CTA liquid surface.
 * Always paints organic oil-on-chrome (WebGL or canvas2d).
 * Optionally overlays Paper LiquidMetal when WebGL is real (non-headless).
 */
import { useEffect, useRef, useState } from "react";
import { LiquidMetal } from "@paper-design/shaders-react";

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.1+vec2(1.3,4.7); a*=.5; } return v; }
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;
  vec2 p=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time*.35;
  vec2 q=p*2.8;
  q+=.7*vec2(fbm(q+vec2(t*.8,-t*.5)), fbm(q*1.25+vec2(-t*.6,t*.9)));
  float n=fbm(q), n2=fbm(q*1.7-t*.3), h=mix(n,n2,.45);
  float hx=fbm(q+vec2(.025,0.))-fbm(q-vec2(.025,0.));
  float hy=fbm(q+vec2(0.,.025))-fbm(q-vec2(0.,.025));
  vec3 N=normalize(vec3(-hx*7.,-hy*7.,.48));
  float diff=max(dot(N,normalize(vec3(.35,.55,.9))),0.);
  float spec=pow(max(dot(N,normalize(vec3(.35,.55,.9)+vec3(0.,0.,1.))),0.),42.);
  vec3 col=mix(vec3(.05,.06,.09), vec3(.3,.34,.42), diff*.85+h*.3);
  col=mix(col, vec3(.88,.9,.94), smoothstep(.55,.95,h)*.45);
  col+=vec3(spec*1.35);
  float phase=h*3.5+t*.18;
  vec3 filmA=vec3(.4,.25,.55), filmB=vec3(.2,.4,.65), filmC=vec3(.3,.5,.4);
  float f=fract(phase);
  vec3 film=f<.33?mix(filmA,filmB,f/.33):f<.66?mix(filmB,filmC,(f-.33)/.33):mix(filmC,filmA,(f-.66)/.34);
  float mask=smoothstep(.18,.5,h)*(1.-smoothstep(.68,.95,h));
  mask*=.5+.5*sin(h*10.+t*1.5);
  col=mix(col, col+film*.45, mask*.5);
  float fres=pow(1.-max(N.z,0.),2.3);
  col+=vec3(.55,.6,.8)*fres*.25;
  col+=film*fres*.12;
  float edge=smoothstep(0.,.08,uv.x)*smoothstep(1.,.92,uv.x)*smoothstep(0.,.15,uv.y)*smoothstep(1.,.85,uv.y);
  col*=.6+.4*edge;
  gl_FragColor=vec4(col,1.);
}
`;

function BaseOilCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let raf = 0, dead = false;
    const start = performance.now();
    const gl = canvas.getContext("webgl", { alpha: false, antialias: true, powerPreference: "high-performance" })
      || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (gl) {
      try {
        const vs = gl.createShader(gl.VERTEX_SHADER)!; gl.shaderSource(vs, VERT); gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(fs, FRAG); gl.compileShader(fs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) || !gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error("sh");
        const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
        gl.useProgram(prog);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "a_pos");
        gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const uRes = gl.getUniformLocation(prog, "u_res");
        const uTime = gl.getUniformLocation(prog, "u_time");
        const frame = (now: number) => {
          if (dead) return;
          const dpr = Math.min(devicePixelRatio || 1, 2);
          const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
          const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
          if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0,0,w,h); }
          gl.uniform2f(uRes, w, h); gl.uniform1f(uTime, (now - start) / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => { dead = true; cancelAnimationFrame(raf); };
      } catch { /* 2d */ }
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frame2 = (now: number) => {
      if (dead) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
      canvas.width = w; canvas.height = h;
      const t = (now - start) / 1000;
      const img = ctx.createImageData(w, h); const d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        const n = Math.sin(u * 6.5 + t * 1.1 + Math.cos(v * 5 - t * 0.6)) * Math.cos(v * 4.5 - t * 0.5 + Math.sin(u * 3 + t * 0.4)) * 0.5 + 0.5;
        let r = 14 + n * 55, g = 16 + n * 60, b = 26 + n * 75;
        if (n > 0.3 && n < 0.82) { const k = (n - 0.3) / 0.52; r += 110 * k; g += 45 * k; b += 150 * k; }
        const spec = Math.max(0, 1 - Math.abs(v - 0.32 - Math.sin(u * 2.2 + t) * 0.1) * 9);
        r += spec * 150; g += spec * 160; b += spec * 170;
        const i = (y * w + x) * 4;
        d[i] = Math.min(255, r | 0); d[i+1] = Math.min(255, g | 0); d[i+2] = Math.min(255, b | 0); d[i+3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(frame2);
    };
    raf = requestAnimationFrame(frame2);
    return () => { dead = true; cancelAnimationFrame(raf); };
  }, []);
  return (
    <canvas ref={ref} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "inherit", pointerEvents: "none", display: "block", zIndex: 0 }} />
  );
}

export function LiquidMetalSurface({ className }: { className?: string }) {
  // Paper only on real GPU (not software/headless). Base canvas always paints.
  const [paper, setPaper] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl", { failIfMajorPerformanceCaveat: true });
      if (gl) setPaper(true);
    } catch { /* keep base only */ }
  }, []);

  return (
    <div className={className} aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <BaseOilCanvas />
      {paper && (
        <div style={{ position: "absolute", inset: 0, mixBlendMode: "soft-light", opacity: 0.85 }}>
          <LiquidMetal
            shape="none"
            colorBack="#0e1016"
            colorTint="#c8d0dc"
            repetition={5}
            softness={0.3}
            distortion={0.28}
            contour={0.1}
            shiftRed={0.3}
            shiftBlue={-0.3}
            angle={38}
            speed={0.65}
            scale={1.25}
            fit="cover"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      )}
    </div>
  );
}
