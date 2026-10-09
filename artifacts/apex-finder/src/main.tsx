import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { classifyApexError, emitApexError } from "@/lib/apex-errors";
import { installApiFetchErrorNotifications } from "@/lib/api-json";
import App from "./App";
import "./index.css";
import "./responsive-shell.css";

installApiFetchErrorNotifications();

function notifyApiOperationError(error: unknown): void {
  if (error instanceof Error && /^(AbortError|CanceledError|CancelledError)$/.test(error.name)) return;
  emitApexError(classifyApexError(error));
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error) => notifyApiOperationError(error) }),
  mutationCache: new MutationCache({ onError: (error) => notifyApiOperationError(error) }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
      // Avoid hammering free Redis via default refetch storms
    },
  },
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("Apex Atlas: #root missing");
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
