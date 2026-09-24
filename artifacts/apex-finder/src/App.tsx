import AppRouter from "./router";
import { OperatorGate } from "@/components/operator-gate";

export default function App() {
  return (
    <OperatorGate>
      <AppRouter />
    </OperatorGate>
  );
}
