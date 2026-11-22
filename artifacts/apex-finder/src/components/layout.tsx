import { useState } from "react";
import { Layout as RoundLayout } from "./layout-round";
import { Layout as LegacyLayout } from "./layout-legacy";

type UiMode = "round" | "legacy";

/** The classic shell remains a live, user-selectable rollback path. */
export function Layout({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<UiMode>(() => {
    if (typeof window === "undefined") return "round";
    const requested = new URLSearchParams(window.location.search).get("ui");
    if (requested === "legacy" || requested === "round") return requested;
    try { return window.localStorage.getItem("apex-atlas-ui") === "legacy" ? "legacy" : "round"; } catch { return "round"; }
  });
  const switchMode = (next: UiMode) => {
    try { window.localStorage.setItem("apex-atlas-ui", next); } catch { /* UI still switches for this session. */ }
    setMode(next);
  };
  return mode === "legacy"
    ? <LegacyLayout onSwitchToRound={() => switchMode("round")}>{children}</LegacyLayout>
    : <RoundLayout onSwitchToLegacy={() => switchMode("legacy")}>{children}</RoundLayout>;
}
