/**
 * Launch CTA oil shaders (WebGL1 GLSL).
 *
 * Performance budget (phone CTA ~300×48 CSS px @ 30fps):
 * - Target ≤ ~12 value-noise taps / pixel
 * - mediump, no derivatives except fwidth on SDF edge
 * - Single domain warp, 2-octave fbm, one light
 *
 * WebGPU: see webgpu-path.ts — same math in WGSL when adapters are widespread.
 */

export const OIL_VERT = /* glsl */ `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * Cost math (approx):
 *   2-octave fbm ≈ 2 noise = 8 hash corners each → treated as 2 taps in budget
 *   warp: 2 fbm + height 1 fbm + normal 2 fbm = 5 fbm ≈ 10 noise samples
 * Previous dual-warp 4-oct design was ~20–25 samples — too heavy for a CTA.
 */
export const OIL_FRAG = /* glsl */ `
precision mediump float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_motion;
uniform float u_radius;

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

/* 2 octaves only */
float fbm(vec2 p) {
  float v = 0.5 * noise(p);
  p = p * 2.05 + vec2(1.7, 3.1);
  v += 0.25 * noise(p);
  return v;
}

float sdRoundBox(vec2 uv, vec2 halfSize, float r) {
  vec2 q = abs(uv - 0.5) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.2 * u_motion;

  /* Single domain warp */
  vec2 q = p * 1.08;
  vec2 w = vec2(
    fbm(q + vec2(t * 0.38, -t * 0.26)),
    fbm(q * 0.92 + vec2(-t * 0.3, t * 0.42))
  );
  q += 0.48 * w;

  float h = fbm(q);
  /* One-sided finite differences (2 taps) */
  float e = 0.045;
  float hx = fbm(q + vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e));
  vec3 N = normalize(vec3(h - hx, h - hy, 0.88));

  vec3 L = normalize(vec3(0.28, 0.52, 0.78));
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 32.0);

  vec3 col = mix(vec3(0.022, 0.022, 0.038), vec3(0.088, 0.078, 0.125), diff * 0.72 + h * 0.18);
  col = mix(col, vec3(0.48, 0.52, 0.6), smoothstep(0.48, 0.88, h) * 0.18);
  col += vec3(spec * 0.7);

  /* Cheap 2-stop film */
  float phase = fract(h * 1.9 + t * 0.09 + w.x * 0.1);
  vec3 film = mix(vec3(0.48, 0.16, 0.88), vec3(0.18, 0.72, 0.88), phase);
  float filmMask = smoothstep(0.28, 0.52, h) * (1.0 - smoothstep(0.62, 0.9, h));
  col = mix(col, col * 0.4 + film * 0.68, filmMask * 0.42);

  float fres = pow(1.0 - max(N.z, 0.0), 2.15);
  col += vec3(0.82, 0.86, 1.0) * fres * 0.14;

  float vig = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x)
            * smoothstep(0.0, 0.16, uv.y) * smoothstep(1.0, 0.84, uv.y);
  col *= 0.78 + 0.22 * vig;

  /* Label mid-band */
  float mid = 1.0 - smoothstep(0.14, 0.55, abs(uv.y - 0.5));
  col *= 1.0 - mid * 0.25;

  float rr = max(u_radius, 0.35);
  vec2 halfSz = vec2(0.5 - 0.02 / aspect, 0.5 - 0.04);
  float d = sdRoundBox(uv, halfSz, rr * 0.5);
  float aa = fwidth(d) * 1.15;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  col *= mix(0.9, 1.0, smoothstep(0.0, 0.035, -d));
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
