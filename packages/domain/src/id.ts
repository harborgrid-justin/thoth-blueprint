/**
 * Id generation. The domain stays framework-agnostic, so this uses only
 * standard globals (Web Crypto when present) with a deterministic-enough
 * fallback. Callers that need reproducibility can pass their own generator
 * to functions that accept a `makeId`.
 */

let counter = 0;

/** Generate a reasonably unique id with an optional prefix. */
export function createId(prefix = "el"): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID()}`;
  }
  counter += 1;
  const rand = Math.floor(Math.random() * 0xffffffff).toString(16);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}
