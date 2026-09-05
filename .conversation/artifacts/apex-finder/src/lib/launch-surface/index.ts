/** Launch surface underlay — modular entry. */
export {
  createOilRenderer,
  createOilRendererSync,
  type OilRenderer,
} from "./create-oil-renderer";
export { tryCreateOilRendererWebGPU } from "./create-oil-renderer-webgpu";
export { OIL_FRAG, OIL_VERT } from "./shaders";
export { OIL_WGSL, OIL_COMPUTE_NOTES } from "./shaders-wgsl";
export { WEBGPU_MIGRATION_STATUS } from "./webgpu-path";
