# Bureau progress patches

Apply from repo root:

```bash
patch -p0 < patches/case-bureau-investigation-progress.patch
patch -p0 < patches/research-investigation-progress.patch
```

Or on Replit: import this branch; the agent can apply the two patches under `patches/`.

Files touched:
- `artifacts/api-server/src/src/lib/case-bureau.ts`
- `artifacts/apex-finder/src/pages/research.tsx`

Already committed without patch:
- `artifacts/api-server/src/src/lib/investigation-progress.ts`
- `artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts`
