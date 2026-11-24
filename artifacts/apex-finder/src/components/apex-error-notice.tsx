import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X, ArrowUpRight } from "lucide-react";
import { classifyApexError, type ApexUserError } from "@/lib/apex-errors";
import { Link } from "wouter";

function Icon({ severity }: { severity: ApexUserError["severity"] }) {
  if (severity === "critical" || severity === "error") return <AlertCircle className="h-5 w-5" />;
  if (severity === "warning" || severity === "degraded") return <TriangleAlert className="h-5 w-5" />;
  if (severity === "info") return <Info className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5" />;
}

const DISMISSED_ERRORS_KEY = "apex:dismissed-user-errors:v1";

function errorFingerprint(error: ApexUserError): string {
  return [error.code, error.provider ?? "", error.title, error.message].join(":");
}

function readDismissedErrors(): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(DISMISSED_ERRORS_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function ApexErrorNotice() {
  const [error, setError] = useState<ApexUserError | null>(null);
  const dismissedErrors = useRef<Set<string>>(readDismissedErrors());

  const dismissError = () => {
    if (error) {
      dismissedErrors.current.add(errorFingerprint(error));
      try {
        window.sessionStorage.setItem(DISMISSED_ERRORS_KEY, JSON.stringify([...dismissedErrors.current]));
      } catch {
        // Dismissal still applies for this mounted app if storage is unavailable.
      }
    }
    setError(null);
  };

  useEffect(() => {
    const showError = (next: ApexUserError) => {
      const onReactor = window.location.pathname === "/reactor" || window.location.pathname.startsWith("/reactor/");
      const isInlineReactorApiError =
        next.title === "The Apex research service is unavailable" ||
        /Research API is not reachable \(got an HTML page instead of JSON\)/i.test(next.message) ||
        /^API returned non-JSON \(\d{3}\)/i.test(next.message);
      if (onReactor && isInlineReactorApiError) return;
      if (dismissedErrors.current.has(errorFingerprint(next))) return;
      setError(next);
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
              <Link href="/status" onClick={dismissError} className="atlas-error-notice-action min-h-[44px] min-w-[44px]">
                System Status <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
          <button type="button" onClick={dismissError} aria-label="Dismiss message" className="atlas-error-notice-close min-h-[44px] min-w-[44px]">
            <X aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
