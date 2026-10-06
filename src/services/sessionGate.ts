// One deadline covers Firebase initialization, token refresh and server verification.
export function createSessionGate<T>(handlers: {
  loading: () => void; verified: (value: T) => void; anonymous: () => void; failed: (error: unknown) => void;
}, timeoutMs = 35000) {
  let generation = 0;
  let disposed = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout>;
  const clear = () => { clearTimeout(timer); controller?.abort(); controller = undefined; };
  const fail = (error: unknown) => {
    if (disposed) return;
    generation++; clear(); handlers.failed(error);
  };
  const deadline = () => {
    timer = setTimeout(() => fail(new Error('Sign-in is taking longer than expected. Check your connection and retry.')), timeoutMs);
  };
  deadline();
  return {
    async verify(work: (signal: AbortSignal) => Promise<T>) {
      if (disposed) return;
      clear(); const current = ++generation;
      controller = new AbortController();
      const signal = controller.signal;
      deadline(); handlers.loading();
      try {
        const value = await work(signal);
        if (disposed || generation !== current) return;
        clear(); handlers.verified(value);
      } catch (error) { if (!disposed && generation === current) fail(error); }
    },
    anonymous() { if (disposed) return; generation++; clear(); handlers.anonymous(); },
    fail,
    dispose() { disposed = true; generation++; clear(); }
  };
}
