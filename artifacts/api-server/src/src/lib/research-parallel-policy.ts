import { dependencyAwareBatches, type ParallelAction } from "./research-epistemic-vnext";
export type ResearchActionDescriptor = { id: string; dependencies?: string[]; epistemicQuestionId?: string | null; independent?: boolean };
export function buildParallelBatches(descriptors: readonly ResearchActionDescriptor[]): string[][] {
  return dependencyAwareBatches(descriptors.map((descriptor) => ({ id: descriptor.id, dependencies: descriptor.dependencies ?? [], action: async () => undefined }))).map((batch) => batch.map((action) => action.id));
}
export function isEpistemicallyIndependent(a: ResearchActionDescriptor, b: ResearchActionDescriptor): boolean {
  if (a.epistemicQuestionId && b.epistemicQuestionId && a.epistemicQuestionId === b.epistemicQuestionId) return true;
  return Boolean(a.independent && b.independent && !(a.dependencies ?? []).includes(b.id) && !(b.dependencies ?? []).includes(a.id));
}
