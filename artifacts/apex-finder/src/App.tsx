import AppRouter from "./router";
import { ApexErrorNotice } from "@/components/apex-error-notice";
import { OperatorAuthGate } from "@/components/operator-auth-gate";

export default function App() {
  const desk = <AppRouter />;
  return (
    <>
      {import.meta.env.PROD ? <OperatorAuthGate>{desk}</OperatorAuthGate> : desk}
      <ApexErrorNotice />
    </>
  );
}
