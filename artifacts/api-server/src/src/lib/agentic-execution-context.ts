import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();

export function withAgenticExecutionScope<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  return storage.run(scope, fn);
}

export function getAgenticExecutionScope(): string {
  return storage.getStore() ?? "process";
}
