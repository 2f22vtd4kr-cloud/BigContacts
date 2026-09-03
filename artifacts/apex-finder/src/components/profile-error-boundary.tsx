import React from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export class ProfileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Apex] profile render failure", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-full flex items-center justify-center bg-background px-5 py-10">
        <div className="w-full max-w-xl rounded-lg border border-red-500/20 bg-card/70 p-6 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-red-300">
                Profile view failed safely
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The entity was not discarded. The profile renderer hit an unexpected error, so Apex kept the desk visible instead of showing a blank screen.
              </p>
              <div className="mt-4 rounded border border-border/50 bg-muted/10 p-3 font-mono text-[10px] leading-5 text-muted-foreground/80 break-words">
                {this.state.error.message || "Unknown profile render error"}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 rounded border border-primary/25 bg-primary/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/15"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
                <Link
                  href="/profiles"
                  className="inline-flex items-center gap-2 rounded border border-border/60 bg-muted/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Entity ledger
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
