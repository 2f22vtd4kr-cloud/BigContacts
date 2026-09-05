/**
 * Launch CTA fill — liquid mercury / oil film.
 * Full-bleed (alpha=1); CSS border-radius clips. No black corners.
 * Smaller, denser, colorful waves (reference: flowing reflective liquid).
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
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(1.7, 3.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.35 * u_motion;

  /* Dense small waves — many cells across the pill, not 2 giant blobs */
  vec2 q = p * 5.5;
  q += 0.45 * vec2(
    fbm(q + vec2(t * 0.4, -t * 0.3)),
    fbm(q * 1.2 + vec2(-t * 0.35, t * 0.45))
  );
  q += 0.25 * vec2(
    fbm(q * 1.8 - t * 0.2),
    fbm(q * 1.6 + t * 0.22)
  );

  float h = fbm(q);
  float h2 = fbm(q * 1.7 + 4.0 - t * 0.18);
  float field = mix(h, h2, 0.4);

  float e = 0.02;
  float hx = fbm(q + vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e));
  vec3 N = normalize(vec3((field - hx) * 6.0, (field - hy) * 6.0, 1.0));

  vec3 L = normalize(vec3(0.35, 0.6, 0.7));
  float ndl = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 40.0);

  /* Liquid metal base — bright silver fills entire button */
  vec3 base = mix(vec3(0.22, 0.22, 0.28), vec3(0.62, 0.64, 0.72), ndl * 0.9 + field * 0.4);
  base += vec3(0.95, 0.96, 1.0) * spec * 0.9;

  /* Colorful iridescence — smaller scale, high chroma */
  float phase = fract(field * 4.5 + t * 0.25 + q.x * 0.15);
  vec3 c1 = vec3(0.55, 0.25, 0.95); /* violet */
  vec3 c2 = vec3(0.95, 0.35, 0.7);  /* magenta */
  vec3 c3 = vec3(0.25, 0.9, 0.95);  /* cyan */
  vec3 c4 = vec3(0.95, 0.75, 0.3);  /* gold */
  vec3 c5 = vec3(0.3, 0.5, 0.98);   /* blue */
  vec3 film;
  if (phase < 0.2) film = mix(c1, c2, phase / 0.2);
  else if (phase < 0.4) film = mix(c2, c3, (phase - 0.2) / 0.2);
  else if (phase < 0.6) film = mix(c3, c4, (phase - 0.4) / 0.2);
  else if (phase < 0.8) film = mix(c4, c5, (phase - 0.6) / 0.2);
  else film = mix(c5, c1, (phase - 0.8) / 0.2);

  float fres = pow(1.0 - max(N.z, 0.0), 1.8);
  float swirl = smoothstep(0.25, 0.55, field) * (1.0 - smoothstep(0.6, 0.9, field));
  float filmW = clamp(0.5 + swirl * 0.55 + fres * 0.5, 0.0, 0.95);
  vec3 col = mix(base, base * 0.2 + film * 1.15, filmW);

  /* Extra color flecks */
  float fleck = smoothstep(0.55, 0.75, fbm(q * 3.0 + t));
  col = mix(col, col + film * 0.35, fleck * 0.4);

  /* Full bleed — button CSS clips radius; never punch transparent corners */
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;
