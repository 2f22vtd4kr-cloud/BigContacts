/**
 * Launch CTA — AAA chrome + thin-film interference.
 *
 * Physics (approx, real-time):
 *   Optical path δ ≈ 2 n d cosθ  →  phase φ = 2π δ / λ
 *   Spectral reflectance R(λ) ∝ cos²(φ/2)  (simplified 2-beam film)
 *   Sample at R/G/B wavelengths → iridescent RGB without huge blobs.
 *
 * Material:
 *   Conductor-like F0, Blinn specular (cheap GGX stand-in),
 *   dual lights, moving sheen, SDF pill AA.
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

/* Thin-film spectral reflectance at wavelength lambda (nm), thickness d (nm), cosθ */
float filmReflect(float dNm, float cosTheta, float lambdaNm) {
  float n = 1.35; /* oil / soap-film index */
  float delta = 4.0 * 3.14159265 * n * dNm * cosTheta / lambdaNm;
  float c = cos(delta * 0.5);
  return c * c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t = u_time * 0.3 * u_motion;

  /* Fine domain warp — metal flow, not giant watercolor cells */
  vec2 q = p * 2.6;
  vec2 w = vec2(
    fbm(q + vec2(t * 0.32, -t * 0.26)),
    fbm(q * 1.15 + vec2(-t * 0.28, t * 0.38))
  );
  q += 0.32 * w;

  float h = fbm(q);
  float h2 = fbm(q * 1.5 + 3.1 - t * 0.12);
  float height = mix(h, h2, 0.28);

  /* Height-field normals */
  float e = 0.025;
  float hx = fbm(q + vec2(e, 0.0));
  float hy = fbm(q + vec2(0.0, e));
  vec3 N = normalize(vec3((h - hx) * 5.0, (h - hy) * 5.0, 1.0));

  /* —— Chrome conductor lighting —— */
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(0.45, 0.7, 0.65));
  vec3 L2 = normalize(vec3(-0.55, 0.25, 0.6));
  float ndl1 = max(dot(N, L1), 0.0);
  float ndl2 = max(dot(N, L2), 0.0) * 0.4;
  float ndh1 = max(dot(N, normalize(L1 + V)), 0.0);
  float ndh2 = max(dot(N, normalize(L2 + V)), 0.0);
  /* High-exponent specular ≈ polished chrome */
  float spec1 = pow(ndh1, 64.0);
  float spec2 = pow(ndh2, 32.0) * 0.4;
  float specBroad = pow(ndh1, 10.0) * 0.25;

  /* F0 ~ 0.9 conductor albedo (cool silver) */
  vec3 F0 = vec3(0.92, 0.93, 0.95);
  vec3 metalDark = vec3(0.1, 0.11, 0.14);
  vec3 metalMid  = vec3(0.38, 0.4, 0.46);
  vec3 col = mix(metalDark, metalMid, ndl1 * 0.9 + ndl2 + height * 0.15);
  col += F0 * (spec1 + spec2 + specBroad);

  /* —— Thin-film interference ——
     Thickness varies with warped height + slow time (breathing film) */
  float dNm = mix(180.0, 620.0, height) + 40.0 * sin(t * 0.7 + w.x * 2.0);
  float cosTheta = max(N.z, 0.15);
  float rR = filmReflect(dNm, cosTheta, 650.0);
  float rG = filmReflect(dNm, cosTheta, 550.0);
  float rB = filmReflect(dNm, cosTheta, 450.0);
  vec3 film = vec3(rR, rG, rB);
  /* Boost saturation of interference colors */
  film = pow(film, vec3(0.85));
  film = mix(vec3(dot(film, vec3(0.333))), film, 1.35);
  film = clamp(film, 0.0, 1.0);

  /* Film strength: stronger at grazing (Fresnel) + mid height bands */
  float fres = pow(1.0 - cosTheta, 2.5);
  float band = smoothstep(0.3, 0.45, height) * (1.0 - smoothstep(0.58, 0.75, height));
  float filmW = fres * 0.65 + band * 0.4;
  filmW = clamp(filmW, 0.0, 0.85);
  /* Layer film over chrome — energy-ish mix */
  col = mix(col, col * 0.35 + film * 0.95, filmW * 0.7);

  /* Traveling anisotropic sheen (brushed chrome streak) */
  float streak = abs(fract(uv.x * 0.85 - uv.y * 0.25 + t * 0.06) - 0.5);
  float sheen = 1.0 - smoothstep(0.0, 0.07, streak);
  col += F0 * sheen * 0.18 * (0.4 + ndl1);

  /* Soft vignette inside pill */
  float vig = smoothstep(0.0, 0.07, uv.x) * smoothstep(1.0, 0.93, uv.x)
            * smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
  col *= 0.9 + 0.1 * vig;

  /* SDF pill */
  float rr = max(u_radius, 0.35);
  vec2 halfSz = vec2(0.5 - 0.02 / aspect, 0.5 - 0.04);
  float d = sdRoundBox(uv, halfSz, rr * 0.5);
  float aa = fwidth(d) * 1.2;
  float alpha = 1.0 - smoothstep(-aa, aa, d);
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;
