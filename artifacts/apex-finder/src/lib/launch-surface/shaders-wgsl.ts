/**
 * WGSL sources for Launch oil underlay (WebGPU render path).
 * Math mirrors OIL_FRAG (2-oct fbm, single warp, SDF pill).
 *
 * Compute path (optional): a compute shader could prebake a noise
 * texture; for a small CTA, one fullscreen fragment pass is cheaper
 * than dispatch + sample overhead. Compute notes left in comments.
 */

export const OIL_WGSL = /* wgsl */ `
struct Uniforms {
  res: vec2f,
  time: f32,
  motion: f32,
  radius: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  /* Full-screen triangle */
  var p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0),
  );
  var o: VSOut;
  o.pos = vec4f(p[vi], 0.0, 1.0);
  return o;
}

fn hash(p_in: vec2f) -> f32 {
  var p = fract(p_in * vec2f(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

fn noise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let a = hash(i);
  let b = hash(i + vec2f(1.0, 0.0));
  let c = hash(i + vec2f(0.0, 1.0));
  let d = hash(i + vec2f(1.0, 1.0));
  let u2 = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u2.x) + (c - a) * u2.y * (1.0 - u2.x) + (d - b) * u2.x * u2.y;
}

fn fbm(p_in: vec2f) -> f32 {
  var p = p_in;
  var v = 0.5 * noise(p);
  p = p * 2.05 + vec2f(1.7, 3.1);
  v += 0.25 * noise(p);
  return v;
}

fn sd_round_box(uv: vec2f, half_size: vec2f, r: f32) -> f32 {
  let q = abs(uv - vec2f(0.5, 0.5)) - half_size + vec2f(r, r);
  return length(max(q, vec2f(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment
fn fs_main(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let uv = frag.xy / u.res;
  let aspect = u.res.x / max(u.res.y, 1.0);
  let p = (frag.xy - 0.5 * u.res) / min(u.res.x, u.res.y);
  let t = u.time * 0.2 * u.motion;

  var q = p * 1.08;
  let w = vec2f(
    fbm(q + vec2f(t * 0.38, -t * 0.26)),
    fbm(q * 0.92 + vec2f(-t * 0.3, t * 0.42)),
  );
  q += 0.48 * w;

  let h = fbm(q);
  let e = 0.045;
  let hx = fbm(q + vec2f(e, 0.0));
  let hy = fbm(q + vec2f(0.0, e));
  let N = normalize(vec3f(h - hx, h - hy, 0.88));

  let L = normalize(vec3f(0.28, 0.52, 0.78));
  let diff = max(dot(N, L), 0.0);
  let H = normalize(L + vec3f(0.0, 0.0, 1.0));
  let spec = pow(max(dot(N, H), 0.0), 32.0);

  var col = mix(vec3f(0.022, 0.022, 0.038), vec3f(0.088, 0.078, 0.125), diff * 0.72 + h * 0.18);
  col = mix(col, vec3f(0.48, 0.52, 0.6), smoothstep(0.48, 0.88, h) * 0.18);
  col += vec3f(spec * 0.7);

  let phase = fract(h * 1.9 + t * 0.09 + w.x * 0.1);
  let film = mix(vec3f(0.48, 0.16, 0.88), vec3f(0.18, 0.72, 0.88), phase);
  let film_mask = smoothstep(0.28, 0.52, h) * (1.0 - smoothstep(0.62, 0.9, h));
  col = mix(col, col * 0.4 + film * 0.68, film_mask * 0.42);

  let fres = pow(1.0 - max(N.z, 0.0), 2.15);
  col += vec3f(0.82, 0.86, 1.0) * fres * 0.14;

  let vig = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x)
          * smoothstep(0.0, 0.16, uv.y) * smoothstep(1.0, 0.84, uv.y);
  col *= 0.78 + 0.22 * vig;

  let mid = 1.0 - smoothstep(0.14, 0.55, abs(uv.y - 0.5));
  col *= 1.0 - mid * 0.25;

  let rr = max(u.radius, 0.35);
  let half_sz = vec2f(0.5 - 0.02 / aspect, 0.5 - 0.04);
  let d = sd_round_box(uv, half_sz, rr * 0.5);
  /* Approximate AA without fwidth in WGSL — fixed soft edge in UV */
  let aa = 0.0035;
  let alpha = 1.0 - smoothstep(-aa, aa, d);
  col *= mix(0.9, 1.0, smoothstep(0.0, 0.035, -d));
  col = clamp(col, vec3f(0.0), vec3f(1.0));
  return vec4f(col, alpha);
}
`;

/**
 * Optional compute: bake a 256² noise tile once, sample in fragment.
 * Not used for the CTA (extra bandwidth); kept as a migration option
 * for larger full-viewport oil panels later.
 *
 * @compute @workgroup_size(8, 8)
 * fn bake_noise(@builtin(global_invocation_id) id: vec3u) { ... }
 */
export const OIL_COMPUTE_NOTES = `
Compute shaders suit offline noise bake or particle fields.
For Launch CTA: one fragment pass ≈ one draw; compute + texture
sample is more setup for no visible gain on a ~300×48 button.
`;
