// The demo runs the real popup components in an ordinary web page, where the
// chrome.* APIs do not exist. This stubs only the handful of calls those
// components make, so the demo exercises the actual UI code rather than a copy.

const mem: Record<string, unknown> = {};

(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: {
      get: (key: string) => Promise.resolve({ [key]: mem[key] }),
      set: (obj: Record<string, unknown>) => (Object.assign(mem, obj), Promise.resolve()),
      remove: (key: string) => (delete mem[key], Promise.resolve()),
    },
    session: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
  runtime: {
    lastError: undefined,
    sendMessage: (_msg: unknown, cb: (r: unknown) => void) =>
      cb({ type: 'RECENT_BLOCKED_ACTIVITY', flagged: false }),
  },
};

export {};
