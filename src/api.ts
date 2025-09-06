import axios from 'axios';

// Always read backend API base URL from .env file
const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5124';

const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
});

// helper to set/clear token
export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token); // legacy
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
}

// per-request injection (ensures header present even after reloads / multiple axios instances)
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  } else {
    delete (config.headers as any).Authorization;
  }

  // DEBUG: log outgoing request + whether Authorization header exists
  // eslint-disable-next-line no-console
  console.debug('[api] request', { url: config.url, method: config.method, hasAuth: !!config.headers?.Authorization });

  // TRACE: show stack if admin endpoints are requested without auth
  try {
    const url = (config.url || '').toString();
    if ((url.includes('/api/lms/users') || url.includes('/api/lms/progress')) && !config.headers['Authorization']) {
      // eslint-disable-next-line no-console
      console.warn('[api] Missing Authorization for', url);
      // eslint-disable-next-line no-console
      console.trace();
    }
  } catch (_) {}

  return config;
}, (err) => Promise.reject(err));

// normalize empty response bodies to null
api.interceptors.response.use((res) => {
  if (res && (res.data === '' || typeof res.data === 'undefined')) res.data = null;
  return res;
}, (err) => Promise.reject(err));

export default api;

export const getCourseReviews = (courseId: number) =>
  api.get(`/api/lms/courses/${courseId}/reviews`);

export const addCourseReview = (courseId: number, review: { rating: number; comment: string }) =>
  api.post(`/api/lms/courses/${courseId}/reviews`, review);
