import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X, ArrowUpRight } from "lucide-react";
import { classifyApexError, type ApexUserError } from "@/lib/apex-errors";
import { Link } from "wouter";

const tone: Record<ApexUserError["severity"], {border:string; bg:string; icon:string}> = {
  info:{border:"border-sky-400/30",bg:"bg-sky-950/70",icon:"text-sky-300"},
  warning:{border:"border-amber-400/35",bg:"bg-amber-950/75",icon:"text-amber-300"},
  degraded:{border:"border-lime-400/35",bg:"bg-lime-950/70",icon:"text-lime-300"},
  error:{border:"border-orange-400/35",bg:"bg-orange-950/75",icon:"text-orange-300"},
  critical:{border:"border-rose-400/45",bg:"bg-rose-950/80",icon:"text-rose-300"},
};

function Icon({severity}:{severity:ApexUserError["severity"]}) {
  if(severity==="critical"||severity==="error") return <AlertCircle className="h-5 w-5" />;
  if(severity==="warning"||severity==="degraded") return <TriangleAlert className="h-5 w-5" />;
  if(severity==="info") return <Info className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5" />;
}

export function ApexErrorNotice() {
  const [error,setError]=useState<ApexUserError|null>(null);
  useEffect(()=>{
    const on=(e:Event)=>setError((e as CustomEvent<ApexUserError>).detail);
    window.addEventListener("apex:error",on);
    const onWindow=(e:ErrorEvent)=>setError(classifyApexError(e.error?.message ?? e.message));
    const onRejection=(e:PromiseRejectionEvent)=>setError(classifyApexError(e.reason?.message ?? e.reason));
    window.addEventListener("error",onWindow);
    window.addEventListener("unhandledrejection",onRejection);
    return()=>{window.removeEventListener("apex:error",on);window.removeEventListener("error",onWindow);window.removeEventListener("unhandledrejection",onRejection)};
  },[]);
  if(!error) return null;
  const t=tone[error.severity];
  return <div className="fixed inset-x-3 bottom-3 z-[100] flex justify-center sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(440px,calc(100vw-2rem))]" role="alert" aria-live="assertive">
    <section className={`w-full rounded-2xl border ${t.border} ${t.bg} p-4 shadow-2xl backdrop-blur-xl sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${t.icon}`}><Icon severity={error.severity}/></span>
        <div className="min-w-0 flex-1">
          <div className="pr-7 text-[14px] font-semibold text-stone-100">{error.title}</div>
          <p className="mt-1 text-[12px] leading-5 text-stone-300">{error.message}</p>
          <p className="mt-2 text-[11px] leading-5 text-stone-400"><span className="font-semibold text-stone-300">Why:</span> {error.why}</p>
          <div className="mt-3">
            <div className="font-mono text-[10px] uppercase tracking-[.16em] text-stone-500">Next steps</div>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] leading-5 text-stone-300">{error.nextSteps.slice(0,3).map((s,i)=><li key={i}>{s}</li>)}</ul>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {error.retryable && <button type="button" onClick={()=>window.location.reload()} className="atlas-btn-success atlas-pressable min-h-10 rounded-lg px-3 text-[11px]">Try again</button>}
            <Link href="/status" onClick={()=>setError(null)} className="atlas-outline-btn atlas-pressable inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[11px]">System Status <ArrowUpRight className="h-3 w-3"/></Link>
          </div>
        </div>
        <button type="button" onClick={()=>setError(null)} aria-label="Dismiss message" className="atlas-pressable shrink-0 rounded-lg p-2 text-stone-500 hover:text-stone-200"><X className="h-4 w-4"/></button>
      </div>
    </section>
  </div>;
}
