/**
 * WebGPU migration path for Launch oil surface — design notes, not wired.
 *
 * Why not now:
 * - Replit / in-app browsers still need a WebGL1 + 2D fallback chain
 * - CTA is tiny; WebGL1 at 30fps already meets the budget after tap reduction
 * - Safari WebGPU is available but desktop + embed clients vary
 *
 * When to port:
 * 1. Feature-detect `navigator.gpu` and successful requestAdapter()
 * 2. Implement createOilRendererWebGPU(canvas) beside createOilRenderer
 * 3. Prefer: WebGPU → WebGL1 → 2D (same dispose() API)
 *
 * Port checklist:
 * - Map uniforms: u_res, u_time, u_motion, u_radius → WGSL uniform buffer
 * - Full-screen triangle (no vertex buffer) in vertex shader
 * - Copy fbm / noise / sdRoundBox math 1:1 into @fragment
 * - Keep CSS DOM label; GPU only fills underlay
 * - Preserve sleep: no rAF when !visible || document.hidden
 * - Cap frame time (~33ms); reduced-motion = one submit
 *
 * WGSL skeleton (illustrative):
 *
 * struct Uniforms {
 *   res: vec2f,
 *   time: f32,
 *   motion: f32,
 *   radius: f32,
 * }
 * @group(0) @binding(0) var<uniform> u: Uniforms;
 *
 * @vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
 *   var p = array<vec2f, 3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
 *   return vec4f(p[i], 0.0, 1.0);
 * }
 *
 * @fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
 *   // same oil body as OIL_FRAG
 *   return vec4f(col, alpha);
 * }
 */

export const WEBGPU_MIGRATION_STATUS = {
  implemented: false as const,
  preferOrder: ["webgpu", "webgl1", "canvas2d"] as const,
  blocker: "Client coverage + no measurable win on a small 30fps CTA yet",
};
