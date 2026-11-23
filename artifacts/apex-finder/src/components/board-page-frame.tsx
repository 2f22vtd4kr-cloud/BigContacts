import type { ReactNode } from "react";

export function BoardPageFrame({
  title,
  description,
  className,
  breadcrumb,
  split = false,
  children,
}: {
  title: string;
  description: string;
  className: string;
  breadcrumb: string;
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
      <nav className="atlas-board-page-breadcrumb" aria-label="Breadcrumb">
        <span>Apex Atlas</span>
        <span aria-hidden="true">/</span>
        <span>{breadcrumb}</span>
      </nav>
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
