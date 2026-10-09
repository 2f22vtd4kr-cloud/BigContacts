import AppRouter from "./router";
import { ApexErrorNotice } from "@/components/apex-error-notice";
import { OperatorGate } from "@/components/operator-gate";

export default function App() {
  return (
    <>
      <OperatorGate><AppRouter /></OperatorGate>
      <ApexErrorNotice />
    </>
  );
}
