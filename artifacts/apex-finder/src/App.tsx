import AppRouter from "./router";
import { ApexErrorNotice } from "@/components/apex-error-notice";
import { OperatorGate } from "@/components/operator-gate";

/**
 * Replit's development preview may serve a production-mode Vite bundle while
 * the API itself runs with NODE_ENV=development. Use an explicit development
 * userenv flag for the browser bypass; production deployments do not set it.
 */
export default function App() {
  const desk = (
    <>
      <AppRouter />
      <ApexErrorNotice />
    </>
  );

  if (import.meta.env.VITE_APEX_OPERATOR_AUTH_BYPASS === "true") return desk;
  return <OperatorGate>{desk}</OperatorGate>;
}
