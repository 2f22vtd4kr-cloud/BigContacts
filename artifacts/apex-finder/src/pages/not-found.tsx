import { Link } from "wouter";
import { Crosshair } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#050505] px-4 py-16 text-stone-100">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#eab308]/30 bg-[#eab308]/10 text-[#eab308]">
        <Crosshair className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-center text-sm leading-6 text-stone-400">
        That path is not part of the research desk. Head back to Overview or open the reactor.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="atlas-pressable inline-flex min-h-[44px] items-center rounded-xl bg-[#eab308] px-5 text-xs font-bold text-black hover:brightness-105"
        >
          Overview
        </Link>
        <Link
          href="/reactor"
          className="atlas-outline-btn atlas-pressable inline-flex min-h-[44px] items-center rounded-xl px-5 text-xs font-semibold"
        >
          Reactor
        </Link>
      </div>
    </div>
  );
}
