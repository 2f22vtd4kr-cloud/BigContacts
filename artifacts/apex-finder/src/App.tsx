import AppRouter from "./router";
import { ApexErrorNotice } from "@/components/apex-error-notice";
import { OperatorGate } from "@/components/operator-gate";

/**
 * Replit's development preview must be directly inspectable by both humans
 * and automated agents. Bypass the browser sign-in UI in development; the API
 * independently applies the same NODE_ENV=development bypass. Production
 * continues to require the signed operator session.
 */
export default function App() {
  const desk = (
    <>
      <AppRouter />
      <ApexErrorNotice />
    </>
  );

  if (import.meta.env.DEV) return desk;
  return <OperatorGate>{desk}</OperatorGate>;
}
