/**
 * Axios instance with ngrok and timeout defaults.
 * When served via ngrok, adds ngrok-skip-browser-warning to bypass the interstitial for API requests.
 * Adds Authorization Bearer token from localStorage and redirects to /login on 401.
 */
import axios from 'axios';

const TOKEN_KEY = 'recruiter_token';

if (typeof window !== 'undefined' && window.location.hostname.includes('ngrok')) {
  axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
}

// Default timeout for API calls (30 seconds) - prevents infinite loading
axios.defaults.timeout = 30000;

// Add Bearer token to every request when present
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login (except for auth endpoints)
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      const url = err.config?.url || '';
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/setup')) {
        localStorage.removeItem(TOKEN_KEY);
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default axios;
