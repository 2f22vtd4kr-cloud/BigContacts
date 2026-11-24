import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X, ArrowUpRight } from "lucide-react";
import { classifyApexError, type ApexUserError } from "@/lib/apex-errors";
import { Link } from "wouter";

const DISMISSED_ERROR_SESSION_KEY = "apex.dismissed-user-errors.v1";

function dismissedErrorCodes(): Set<string> {
  try {
    const saved = sessionStorage.getItem(DISMISSED_ERROR_SESSION_KEY);
    const values: unknown = saved ? JSON.parse(saved) : [];
    return new Set(Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : []);
  } catch { return new Set(); }
}

function rememberDismissedError(code: string) {
  try {
    const codes = dismissedErrorCodes();
    codes.add(code);
    sessionStorage.setItem(DISMISSED_ERROR_SESSION_KEY, JSON.stringify([...codes].slice(-40)));
  } catch { /* Session storage may be unavailable. */ }
}

function Icon({ severity }: { severity: ApexUserError["severity"] }) {
  if (severity === "critical" || severity === "error") return <AlertCircle className="h-5 w-5" />;
  if (severity === "warning" || severity === "degraded") return <TriangleAlert className="h-5 w-5" />;
  if (severity === "info") return <Info className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5" />;
}

export function ApexErrorNotice() {
  const [error, setError] = useState<ApexUserError | null>(null);\n  const dismissedCodes = useRef(dismissedErrorCodes());

  useEffect(() => {
    const showError = (next: ApexUserError) => {
      const onReactor = window.location.pathname === "/reactor" || window.location.pathname.startsWith("/reactor/");
      const isInlineReactorApiError =
        next.title === "The Apex research service is unavailable" ||
        /Research API is not reachable \(got an HTML page instead of JSON\)/i.test(next.message) ||
        /^API returned non-JSON \(\d{3}\)/i.test(next.message);
      if (onReactor && isInlineReactorApiError) return;
      if (dismissedCodes.current.has(next.code)) return;\n      setError(next);
    };

    const on = (event: Event) => showError((event as CustomEvent<ApexUserError>).detail);
    const onWindow = (event: ErrorEvent) => showError(classifyApexError(event.error?.message ?? event.message));
    const onRejection = (event: PromiseRejectionEvent) => showError(classifyApexError(event.reason?.message ?? event.reason));

    window.addEventListener("apex:error", on);
    window.addEventListener("error", onWindow);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("apex:error", on);
      window.removeEventListener("error", onWindow);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!error) return null;

  return (
    <div className="atlas-error-notice max-h-[38dvh] sm:max-h-[min(52dvh,360px)]" role="alert" aria-live="assertive">
      <section className="atlas-error-notice-card" data-severity={error.severity}>
        <div className="atlas-error-notice-layout">
          <span className="atlas-error-notice-icon" aria-hidden="true">
            <Icon severity={error.severity} />
          </span>
          <div className="atlas-error-notice-content">
            <div className="atlas-error-notice-title">{error.title}</div>
            <p className="atlas-error-notice-message">{error.message}</p>
            <p className="atlas-error-notice-why"><strong>Why:</strong> {error.why}</p>
            <div className="atlas-error-notice-next">
              <div className="atlas-error-notice-label">Next steps</div>
              <ul>
                {error.nextSteps.slice(0, 3).map((step, index) => <li key={index}>{step}</li>)}
              </ul>
            </div>
            <div className="atlas-error-notice-actions">
              {error.retryable && (
                <button type="button" onClick={() => window.location.reload()} className="atlas-error-notice-action min-h-[44px] min-w-[44px]">
                  Try again
                </button>
              )}
              <Link href="/status" onClick={() => { if (error) { dismissedCodes.current.add(error.code); rememberDismissedError(error.code); } setError(null); }} className="atlas-error-notice-action min-h-[44px] min-w-[44px]">
                System Status <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <button type="button" onClick={() => { if (error) { dismissedCodes.current.add(error.code); rememberDismissedError(error.code); } setError(null); }} aria-label="Dismiss message" className="atlas-error-notice-close min-h-[44px] min-w-[44px]">
            <X aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
