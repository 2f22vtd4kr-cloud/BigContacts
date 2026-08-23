# Launch surface (oil CTA)

## Layout
| Path | Role |
|------|------|
| `artifacts/apex-finder/src/lib/launch-surface/shaders.ts` | GLSL + WebGPU notes |
| `artifacts/apex-finder/src/lib/launch-surface/create-oil-renderer.ts` | WebGL / 2D driver, sleep/wake |
| `artifacts/apex-finder/src/components/liquid-metal-surface.tsx` | React wrapper only |

## Performance
- ~30fps cap; true sleep when off-screen or tab hidden (no RAF spin)
- 3-octave fbm, **single** domain warp, 3-tap normals (cheaper than dual-warp 4-octave)
- `precision mediump` on mobile-friendly path
- DPR clamp ≤2; `powerPreference: low-power`
- `prefers-reduced-motion` → one static frame

## WebGPU migration (not shipped)
1. Feature-detect `navigator.gpu`
2. Port `OIL_FRAG` body to WGSL fragment (same uniforms: res, time, motion, radius)
3. Full-screen triangle pipeline; no vertex buffer required
4. Fallback: WebGPU → WebGL1 → 2D (already have last two)
5. Keep **DOM label** — GPU never owns the wordmark

## Readability
Label is CSS above the canvas (plate + solid type). Shader mid-band is slightly darker so film does not wash text.
