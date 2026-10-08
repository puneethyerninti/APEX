import axios from 'axios';
import { auth } from '@/firebase.config';
import { useAppStore } from '@/store/useAppStore';
import { waitForSessionReadiness, settleSessionReadiness } from './sessionReadiness';
import { applyApplicationSession, clearApplicationSession, sessionGeneration } from './applicationSession';

let refreshing: { uid: string; generation: number; work: Promise<string> } | null = null;
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 60000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(async config => {
  if (typeof window !== 'undefined' && config.url !== '/user/session') {
    const started = sessionGeneration();
    if ((config as any)._apexGeneration === undefined) (config as any)._apexGeneration = started;
    if (!await waitForSessionReadiness()) throw new axios.CanceledError('Session is unavailable.');
    const current = sessionGeneration();
    if ((config as any)._apexGeneration !== undefined && (config as any)._apexGeneration !== current) throw new axios.CanceledError('Sign-in changed.');
    (config as any)._apexGeneration = current;
    const token = useAppStore.getState().user ? localStorage.getItem('apex_token') : null;
    if (token) config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

api.interceptors.response.use(response => {
  if ((response.config as any)._apexGeneration !== undefined && (response.config as any)._apexGeneration !== sessionGeneration()) throw new axios.CanceledError('Sign-in changed.');
  return response;
}, async error => {
  const config = error.config;
  if (config?._apexGeneration !== undefined && config._apexGeneration !== sessionGeneration()) throw new axios.CanceledError('Sign-in changed.');
  if (!config || config.url === '/user/session' || error.response?.status !== 401) return Promise.reject(error);
  const generation = config._apexGeneration;
  if (generation !== sessionGeneration()) throw new axios.CanceledError('Sign-in changed.');
  const identity = auth.currentUser;
  const owner = useAppStore.getState().user?.uid;
  if (identity && owner && !config._sessionRetried) {
    config._sessionRetried = true;
    try {
      if (!refreshing || refreshing.uid !== identity.uid || refreshing.generation !== generation) {
        const entry = { uid: identity.uid, generation, work: Promise.resolve('') };
        entry.work = (async () => {
          const proof = await identity.getIdToken();
          if (auth.currentUser?.uid !== identity.uid || sessionGeneration() !== generation) throw new axios.CanceledError('Sign-in changed.');
          const response = await axios.post(api.defaults.baseURL + '/user/session', {}, { headers: { Authorization: 'Bearer ' + proof }, timeout: 30000 });
          if (auth.currentUser?.uid !== identity.uid || sessionGeneration() !== generation || useAppStore.getState().user?.uid !== owner) throw new axios.CanceledError('Sign-in changed.');
          if (response.data?.user?._id !== owner) throw new Error('Session identity changed.');
          applyApplicationSession(response.data);
          return response.data.token as string;
        })().finally(() => { if (refreshing === entry) refreshing = null; });
        refreshing = entry;
      }
      config.headers.Authorization = 'Bearer ' + await refreshing.work;
      return api.request(config);
    } catch (failure: any) {
      // A transient server outage must not erase a valid Firebase sign-in or redirect-loop.
      if (axios.isCancel(failure) || failure.response?.status === 503 || !failure.response) return Promise.reject(failure);
    }
  }
  if (generation === sessionGeneration()) {
    clearApplicationSession(); settleSessionReadiness(false);
    window.dispatchEvent(new Event('apex-session-invalid'));
  }
  return Promise.reject(error);
});
