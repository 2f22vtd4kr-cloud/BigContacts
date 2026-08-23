/**
 * Launch CTA oil — rich iridescent film (visual priority restored).
 * Budgeted: 3-oct fbm, single warp, mediump.
 */
export const OIL_VERT = /* glsl */ `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 3.1);
    a *= 0.5;
  }
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
  float t = u_time * 0.28 * u_motion;

  vec2 q = p * 1.15;
  vec2 w = vec2(
    fbm(q + vec2(t * 0.45, -t * 0.32)),
    fbm(q * 0.9 + vec2(-t * 0.36, t * 0.5))
  );
  q += 0.55 * w;

  float h = fbm(q);
  float h2 = fbm(q * 0.75 - t * 0.2);
  float blob = mix(h, h2, 0.35);

  float e = 0.038;
  float hx = fbm(q + vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e));
  vec3 N = normalize(vec3(blob - hx, blob - hy, 0.72));

  vec3 L1 = normalize(vec3(0.25, 0.55, 0.8));
  vec3 L2 = normalize(vec3(-0.45, 0.2, 0.7));
  float diff = max(dot(N, L1), 0.0) + max(dot(N, L2), 0.0) * 0.4;
  float spec = pow(max(dot(N, normalize(L1 + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);

  vec3 col = mix(vec3(0.06, 0.05, 0.09), vec3(0.18, 0.15, 0.26), diff * 0.8 + blob * 0.3);
  col = mix(col, vec3(0.6, 0.62, 0.72), smoothstep(0.4, 0.88, blob) * 0.42);
  col += vec3(spec * 1.05);

  float phase = fract(blob * 2.2 + t * 0.15 + w.x * 0.2);
  vec3 violet  = vec3(0.55, 0.2, 0.95);
  vec3 magenta = vec3(0.95, 0.28, 0.72);
  vec3 cyan    = vec3(0.25, 0.88, 0.95);
  vec3 blue    = vec3(0.2, 0.4, 0.95);
  vec3 film;
  if (phase < 0.25) film = mix(violet, magenta, phase / 0.25);
  else if (phase < 0.5) film = mix(magenta, cyan, (phase - 0.25) / 0.25);
  else if (phase < 0.75) film = mix(cyan, blue, (phase - 0.5) / 0.25);
  else film = mix(blue, violet, (phase - 0.75) / 0.25);

  float filmMask = smoothstep(0.18, 0.45, blob) * (1.0 - smoothstep(0.68, 0.95, blob));
  filmMask *= 0.55 + 0.45 * sin(blob * 4.0 + t * 0.9);
  col = mix(col, col * 0.2 + film * 1.15, filmMask * 0.85);

  /* Fresnel + tiny chromatic fringe (oil film dispersion) */
  float fres = pow(1.0 - max(N.z, 0.0), 2.0);
  col += vec3(0.92, 0.94, 1.0) * fres * 0.26;
  col.r += violet.r * fres * 0.18;
  col.g += cyan.g * fres * 0.12;
  col.b += blue.b * fres * 0.16;

  float vig = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x)
            * smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.86, uv.y);
  col *= 0.82 + 0.18 * vig;

  float mid = 1.0 - smoothstep(0.2, 0.55, abs(uv.y - 0.5));
  col *= 1.0 - mid * 0.1;

  float rr = max(u_radius, 0.35);
  vec2 halfSz = vec2(0.5 - 0.02 / aspect, 0.5 - 0.04);
  float d = sdRoundBox(uv, halfSz, rr * 0.5);
  float aa = fwidth(d) * 1.2;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  col *= mix(0.9, 1.0, smoothstep(0.0, 0.04, -d));
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
