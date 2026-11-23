import { useId, type SVGProps } from "react";

/** Small quartered heraldic shield used in the Apex Atlas wordmark. */
export function ApexAtlasMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  const clipId = `apex-atlas-shield-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false" {...props}>
      <defs>
        <clipPath id={clipId}>
          <path d="M5 3.5H27V17C27 22.4 21.1 26.6 16 29C10.9 26.6 5 22.4 5 17V3.5Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d="M5 3.5H16V16.5H5Z" fill="#C8321E" />
        <path d="M16 3.5H27V16.5H16Z" fill="#EDB92B" />
        <path d="M5 16.5H16V29H5Z" fill="#EDB92B" />
        <path d="M16 16.5H27V29H16Z" fill="#C8321E" />
      </g>
      <path d="M5 3.5H27V17C27 22.4 21.1 26.6 16 29C10.9 26.6 5 22.4 5 17V3.5Z" fill="none" stroke="#18181A" strokeWidth="1.1" />
    </svg>
  );
}
