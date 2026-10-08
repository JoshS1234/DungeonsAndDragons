/** A caught error's message, or `fallback` if it doesn't have one. */
export const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

/** True for Firestore/Firebase "permission-denied" errors. */
export const isPermissionDenied = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  err.code === "permission-denied";
