import axios from 'axios';
import type { RecaptchaVerifier } from 'firebase/auth';
import { api } from '@/services/api';

let warming: Promise<void> | null = null;
let lastWakeAt = -Infinity;

export function warmAuthBackend(): Promise<void> {
  if (warming) return warming;
  if (Date.now() - lastWakeAt < 60000) return Promise.resolve();
  let url: URL;
  try {
    url = new URL(api.defaults.baseURL || '', window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return Promise.resolve();
  } catch { return Promise.resolve(); }
  lastWakeAt = Date.now();
  // One anonymous request overlaps server startup with phone entry, never a keep-alive loop.
  const work = axios.get(url.origin + '/', { timeout: 65000, withCredentials: false })
    .then(() => {}, () => {}).finally(() => { if (warming === work) warming = null; });
  warming = work;
  return work;
}

export function createRecaptchaPreparation(create: () => RecaptchaVerifier) {
  let verifier: RecaptchaVerifier | null = null;
  let rendering: Promise<void> | null = null;
  let generation = 0;
  const get = () => verifier || (verifier = create());
  const clear = () => {
    generation++;
    const previous = verifier;
    verifier = null; rendering = null;
    previous?.clear();
  };
  return {
    get, clear,
    prepare(): Promise<void> {
      if (rendering) return rendering;
      let candidate: RecaptchaVerifier;
      try { candidate = get(); } catch { return Promise.resolve(); }
      const current = generation;
      const work = Promise.resolve().then(() => {
        if (generation === current) return candidate.render();
      }).then(() => {}, () => {
        if (generation === current && verifier === candidate) clear();
      }).finally(() => { if (rendering === work) rendering = null; });
      rendering = work;
      return work;
    }
  };
}
