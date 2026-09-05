/**
 * WebGPU status for Launch oil surface.
 * Runtime: tryCreateOilRendererWebGPU() is live; fallback WebGL → 2D.
 * Compute: optional noise-bake not wired (fragment pass is enough for CTA).
 */
export const WEBGPU_MIGRATION_STATUS = {
  implemented: true as const,
  preferOrder: ["webgpu", "webgl1", "canvas2d"] as const,
  computeNoiseBake: false as const,
  note: "Fragment WGSL mirrors GLSL oil; compute bake reserved for full-viewport panels.",
};
