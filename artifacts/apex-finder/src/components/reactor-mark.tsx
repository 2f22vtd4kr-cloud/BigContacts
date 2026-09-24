import { Atom, type LucideProps } from "lucide-react";

export function ReactorMark({ size = 18, ...props }: LucideProps & { size?: number }) {
  return <Atom width={size} height={size} aria-hidden="true" {...props} />;
}
