// Circuit breaker against runaway Firebase usage (e.g. a React effect stuck
// in a loop). If the app makes more than LIMIT calls within WINDOW_MS, every
// further call fails until the page is reloaded, so a bug can't quietly run
// up a bill. Normal use is a handful of calls a minute.

export const LIMIT = 300;
export const WINDOW_MS = 60_000;

export class UsageLimitError extends Error {
  constructor() {
    super(
      "This page made an unusually large number of requests, so it's been paused to avoid unexpected charges. Please reload the page."
    );
    this.name = "UsageLimitError";
  }
}

let calls: number[] = [];
let tripped = false;
let totalCalls = 0;

// The end-to-end tests read this to check pages go quiet once loaded
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  Object.defineProperty(globalThis, "__firebaseCallCount", {
    get: () => totalCalls,
    configurable: true,
  });
}
const listeners = new Set<() => void>();

/** Call before every Firebase network operation. Throws once tripped. */
export const recordCall = (now = Date.now()) => {
  if (tripped) throw new UsageLimitError();
  totalCalls++;
  calls.push(now);
  while (calls.length > 0 && calls[0] <= now - WINDOW_MS) calls.shift();
  if (calls.length > LIMIT) {
    tripped = true;
    console.error(
      `Firebase usage guard tripped: more than ${LIMIT} calls in ${WINDOW_MS / 1000}s`
    );
    listeners.forEach((listener) => listener());
    throw new UsageLimitError();
  }
};

export const isTripped = () => tripped;

/** Be told when the guard trips. Returns an unsubscribe function. */
export const onTrip = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** For tests. */
export const resetUsageGuard = () => {
  calls = [];
  tripped = false;
};
