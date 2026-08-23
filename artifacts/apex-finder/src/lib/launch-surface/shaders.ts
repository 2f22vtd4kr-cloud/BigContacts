/**
 * Launch CTA — liquid metal (chrome + thin-film), not soft purple blobs.
 * Fine-scale warp, strong specular, film only as edge/height accent.
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
    p = p * 2.15 + vec2(1.7, 3.1);
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
  /* Finer feature scale — avoids giant watercolor blobs */
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.32 * u_motion;

  vec2 q = p * 2.4;
  vec2 w = vec2(
    fbm(q + vec2(t * 0.35, -t * 0.28)),
    fbm(q * 1.1 + vec2(-t * 0.3, t * 0.4))
  );
  q += 0.35 * w;

  float h = fbm(q);
  float h2 = fbm(q * 1.4 + 2.7 - t * 0.15);
  float height = mix(h, h2, 0.3);

  float e = 0.028;
  float hx = fbm(q + vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e));
  vec3 N = normalize(vec3((h - hx) * 4.0, (h - hy) * 4.0, 1.0));

  /* Metallic lighting */
  vec3 L = normalize(vec3(0.4, 0.65, 0.7));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float ndl = max(dot(N, L), 0.0);
  float ndh = max(dot(N, normalize(L + V)), 0.0);
  float spec = pow(ndh, 48.0);
  float spec2 = pow(ndh, 12.0) * 0.35;

  /* Chrome / wet metal base — cool silver, not purple fill */
  vec3 metalDark = vec3(0.12, 0.13, 0.18);
  vec3 metalLit  = vec3(0.55, 0.58, 0.68);
  vec3 col = mix(metalDark, metalLit, ndl * 0.85 + height * 0.2);
  col += vec3(0.95, 0.96, 1.0) * spec;
  col += vec3(0.55, 0.6, 0.7) * spec2;

  /* Thin-film ONLY in bands + rim — not whole-button purple blobs */
  float phase = fract(height * 3.5 + t * 0.2 + w.x * 0.25);
  vec3 film = mix(
    mix(vec3(0.45, 0.2, 0.9), vec3(0.9, 0.3, 0.75), smoothstep(0.0, 0.4, phase)),
    mix(vec3(0.2, 0.85, 0.95), vec3(0.35, 0.45, 0.95), smoothstep(0.4, 1.0, phase)),
    smoothstep(0.2, 0.8, phase)
  );
  float band = smoothstep(0.35, 0.48, height) * (1.0 - smoothstep(0.55, 0.7, height));
  float fres = pow(1.0 - max(N.z, 0.0), 2.4);
  float filmAmt = band * 0.45 + fres * 0.55;
  col = mix(col, col * 0.4 + film * 1.0, filmAmt * 0.7);

  /* Moving diagonal sheen */
  float sheen = smoothstep(0.0, 0.08, abs(fract(uv.x * 0.7 + uv.y * 0.35 + t * 0.08) - 0.5));
  col += vec3(0.9, 0.93, 1.0) * (1.0 - sheen) * 0.22 * ndl;

  float vig = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x)
            * smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.88, uv.y);
  col *= 0.88 + 0.12 * vig;

  float rr = max(u_radius, 0.35);
  vec2 halfSz = vec2(0.5 - 0.02 / aspect, 0.5 - 0.04);
  float d = sdRoundBox(uv, halfSz, rr * 0.5);
  float aa = fwidth(d) * 1.2;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
