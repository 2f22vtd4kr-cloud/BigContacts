# Launch surface (oil CTA)

## Layout
| Path | Role |
|------|------|
| `lib/launch-surface/shaders.ts` | WebGL1 GLSL |
| `lib/launch-surface/shaders-wgsl.ts` | WebGPU WGSL + compute notes |
| `lib/launch-surface/create-oil-renderer-webgpu.ts` | WebGPU driver |
| `lib/launch-surface/create-oil-renderer.ts` | Async factory + WebGL/2D |
| `components/liquid-metal-surface.tsx` | React shell |

## Prefer order
**WebGPU → WebGL1 → 2D canvas** (`createOilRenderer` async).

## Performance
- ~30fps; true sleep off-screen / tab hidden
- 2-oct fbm, single domain warp
- No MSAA on WebGL CTA path
- DPR ≤ 2; reduced-motion → one frame

## Compute shaders
Not used on the CTA. A noise-bake compute pass is documented in `shaders-wgsl.ts` for larger full-viewport oil only — fragment pass wins on a ~300×48 button.

## Readability
DOM/CSS label above canvas; shader mid-band darkened under type.
