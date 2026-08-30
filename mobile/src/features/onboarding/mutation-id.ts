export function createOnboardingMutationId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID !== 'function') {
    throw new Error('Secure mutation identifier generation is unavailable');
  }
  return randomUUID.call(globalThis.crypto);
}
