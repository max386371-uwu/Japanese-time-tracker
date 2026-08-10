// Tiny id helper. crypto.randomUUID is available in service workers,
// extension pages, and popups in modern Chrome, so we lean on it and
// fall back to a timestamp+random string just in case.
export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
