import axios from 'axios';
import { auth } from '@/firebase.config';

let refreshing: Promise<string> | null = null;

// Create a centralized Axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', // Replace with your real backend URL
  timeout: 60000, // Increased to 60s to handle Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT tokens to every request
api.interceptors.request.use(
  (config) => {
    // In a real app, you might get this from localStorage, Zustand, or Cookies
    const token = typeof window !== 'undefined' ? localStorage.getItem('apex_token') : null;
    
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global error handling (e.g., token expiration)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/user/session')) {
      if (auth.currentUser && !error.config._sessionRetried) {
        error.config._sessionRetried = true;
        try {
          refreshing ||= auth.currentUser.getIdToken(true).then(proof =>
            axios.post(api.defaults.baseURL + '/user/session', {}, { headers: { Authorization: 'Bearer ' + proof } })
          ).then(response => {
            localStorage.setItem('apex_token', response.data.token);
            return response.data.token as string;
          }).finally(() => { refreshing = null; });
          error.config.headers.Authorization = 'Bearer ' + await refreshing;
          return api.request(error.config);
        } catch { /* Fall through to sign-in when session recovery fails. */ }
      }
      // Unauthorized: Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('apex_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
