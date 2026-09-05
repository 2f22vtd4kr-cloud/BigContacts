import * as React from "react";

export function Dialog({ children, open, onOpenChange }: any) {
  if (open === false) return null;
  return <div data-testid="dialog-root">{children}</div>;
}
export function DialogContent({ children, className }: any) {
  return <div className={className} role="dialog">{children}</div>;
}
export function DialogHeader({ children }: any) { return <div>{children}</div>; }
export function DialogTitle({ children }: any) { return <h2>{children}</h2>; }
export function DialogFooter({ children }: any) { return <div>{children}</div>; }
export function DialogClose({ children, ...props }: any) {
  return <button type="button" {...props}>{children ?? "Close"}</button>;
}
