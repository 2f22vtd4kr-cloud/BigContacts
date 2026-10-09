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
  const scope = getAgenticExecutionScope();
  const match = /^agentic:(?:[^:]+|case:[^:]+(?::run:[^:]+)?):investigator:(.+)$/.exec(scope);
  const capability = match?.[1]?.trim() ?? "";
  if (/^groq-investigator-\d+$/.test(capability) || capability === "groq") return "groq";
  if (capability === "mistral") return "mistral";
  return null;
}
