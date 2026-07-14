import axios from 'axios';

// Create a centralized Axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', // Replace with your real backend URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT tokens to every request
api.interceptors.request.use(
  (config) => {
    // In a real app, you might get this from localStorage, Zustand, or Cookies
    const token = typeof window !== 'undefined' ? localStorage.getItem('apex_token') : null;
    
    if (token && config.headers) {
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
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized: Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('apex_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
