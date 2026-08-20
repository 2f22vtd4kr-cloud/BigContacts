/**
 * Compatibility entry.
 * Real API lives under `src/src/` (see build.mjs entryPoints).
 * This file re-exports that server so tools that resolve `src/index.ts`
 * still get full routes + desk static serving — not the old health-only scaffold.
 */
import "./src/index";
