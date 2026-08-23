/**
 * Launch CTA liquid-metal underlay — thin React shell.
 * Rendering lives in lib/launch-surface (shaders + createOilRenderer).
 */
import { useEffect, useRef } from "react";
import { createOilRenderer } from "@/lib/launch-surface";

export function LiquidMetalSurface({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = createOilRenderer(canvas);
    return () => renderer.dispose();
  }, []);

  return (
    <div
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <canvas
        ref={ref}
        className="pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]"
        aria-hidden
        style={{ zIndex: 0 }}
      />
    </div>
  );
}
