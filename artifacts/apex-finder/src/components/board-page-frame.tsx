import type { ReactNode } from "react";

export function BoardPageFrame({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={`atlas-board-page ${className}`}>
      <header className="atlas-board-page-intro">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="atlas-board-page-content">{children}</div>
    </div>
  );
}
