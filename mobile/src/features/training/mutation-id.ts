export function createTrainingMutationId() {
  const id = globalThis.crypto?.randomUUID?.();
  if (!id) throw new Error('Secure random training mutation ids are unavailable');
  return id;
}
