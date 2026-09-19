import type { SVGProps } from "react";

export function ReactorMark({ size = 18, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M7.5 27h17M9.5 27c1.1-4.3 1.8-8.8 2.1-13.3C11.9 9.7 14 6.5 16 6.5s4.1 3.2 4.4 7.2c.3 4.5 1 9 2.1 13.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11.7 12.2h8.6M13.1 8.5c.8-1.4 1.8-2.1 2.9-2.1s2.1.7 2.9 2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14.1 4.4c-.7-.8-.6-1.5.1-2.2M17.9 4.4c.7-.8.6-1.5-.1-2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M5 24.2h3M24 24.2h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".65"/>
    </svg>
  );
}
