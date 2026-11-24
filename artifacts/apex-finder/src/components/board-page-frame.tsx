import type { ReactNode } from "react";

export function BoardPageFrame({
  breadcrumb,
  title,
  description,
  className,
  split = false,
  children,
}: {
  breadcrumb?: ReactNode;
  title: string;
  description: string;
  className: string;
  split?: boolean;
  children: ReactNode;
}) {
  const intro = (
    <>
      {breadcrumb && (
        <nav className="atlas-board-page-breadcrumb" aria-label="Breadcrumb">
          {breadcrumb}
        </nav>
      )}
      <header className="atlas-board-page-intro">
      <h1>{title}</h1>
      <p>{description}</p>
      </header>
    </>
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
