import type { ReactNode } from "react";

export function BoardPageFrame({
  title,
  description,
  className,
  split = false,
  children,
}: {
  title: string;
  description: string;
  className: string;
  split?: boolean;
  children: ReactNode;
}) {
  const intro = (
    <header className="atlas-board-page-intro">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );

  return (
    <div className={`atlas-board-page ${className}`}>
      {split ? (
        <div className="atlas-board-page-grid">
          {intro}
          {children}
        </div>
      ) : (
        <>
          {intro}
          <div className="atlas-board-page-content">{children}</div>
        </>
      )}
    </div>
  );
}
