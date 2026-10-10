import AppRouter from "./router";
import { ApexErrorNotice } from "@/components/apex-error-notice";

export default function App() {
  return (
    <>
      <AppRouter />
      <ApexErrorNotice />
    </>
  );
}
