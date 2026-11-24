import { useId } from "react";

/** Board heraldic mark: four tinctures clipped to the Atlas shield silhouette. */
export function ApexAtlasMark({ className = "atlas-reactor-board-mark" }: { className?: string }) {
  const clipId = `atlas-shield-${useId().replace(/:/g, "")}`;
  return (
    <svg className={className} viewBox="0 0 20 22" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}>
          <path d="M0 0h20v12c0 5.5-4.2 8.6-10 10C4.2 20.6 0 17.5 0 12z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="10" height="11" fill="#C8321E" />
        <rect x="10" width="10" height="11" fill="#EDB92B" />
        <rect y="11" width="10" height="11" fill="#EDB92B" />
        <rect x="10" y="11" width="10" height="11" fill="#C8321E" />
      </g>
    </svg>
  );
}
