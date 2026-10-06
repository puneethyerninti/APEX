let finish: (ready: boolean) => void;
let readiness = new Promise<boolean>(resolve => { finish = resolve; });

export function resetSessionReadiness() {
  finish(false);
  readiness = new Promise<boolean>(resolve => { finish = resolve; });
}

export function settleSessionReadiness(ready: boolean) {
  finish(ready);
}

export async function waitForSessionReadiness(): Promise<boolean> {
  const current = readiness;
  const ready = await current;
  return current === readiness ? ready : waitForSessionReadiness();
}
