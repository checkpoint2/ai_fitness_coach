export function createDiaryMutationId() {
  const id = globalThis.crypto?.randomUUID?.();
  if (!id) throw new Error('Secure random diary mutation ids are unavailable');
  return id;
}
