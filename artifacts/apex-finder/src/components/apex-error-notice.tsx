import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X, ArrowUpRight } from "lucide-react";
import { classifyApexError, type ApexUserError } from "@/lib/apex-errors";
import { Link } from "wouter";
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
    window.addEventListener("error",onWindow); window.addEventListener("unhandledrejection",onRejection);
    return()=>{window.removeEventListener("apex:error",on);window.removeEventListener("error",onWindow);window.removeEventListener("unhandledrejection",onRejection)};
  },[]);
  if(!error) return null;
  return <div className="atlas-error-notice" role="alert" aria-live="assertive"><section className="atlas-error-notice-card" data-severity={error.severity}>
    <div className="atlas-error-notice-layout"><span className="atlas-error-notice-icon" aria-hidden="true"><Icon severity={error.severity}/></span>
      <div className="atlas-error-notice-content"><div className="atlas-error-notice-title">{error.title}</div>
        <p className="atlas-error-notice-message">{error.message}</p><p className="atlas-error-notice-why"><strong>Why:</strong> {error.why}</p>
        <div className="atlas-error-notice-next"><div className="atlas-error-notice-label">Next steps</div><ul>{error.nextSteps.slice(0,3).map((s,i)=><li key={i}>{s}</li>)}</ul></div>
        <div className="atlas-error-notice-actions">{error.retryable && <button type="button" onClick={()=>window.location.reload()} className="atlas-error-notice-action">Try again</button>}
          <Link href="/status" onClick={()=>setError(null)} className="atlas-error-notice-action">System Status <ArrowUpRight aria-hidden="true" /></Link></div>
      </div><button type="button" onClick={()=>setError(null)} aria-label="Dismiss message" className="atlas-error-notice-close"><X aria-hidden="true" /></button>
    </div></section></div>;
}
