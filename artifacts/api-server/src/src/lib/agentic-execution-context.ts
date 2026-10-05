import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();

export function withAgenticExecutionScope<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  return storage.run(scope, fn);
}

export function getAgenticExecutionScope(): string {
  return storage.getStore() ?? "process";
}

/** Extract the Boss-selected Investigator provider from the execution scope. */
export function getAgenticSelectedInvestigator(): "groq" | "mistral" | null {
  const match = /^agentic:[^:]+:investigator:(groq|mistral)$/.exec(getAgenticExecutionScope());
  return match?.[1] === "groq" || match?.[1] === "mistral" ? match[1] : null;
}