import axios from 'axios';

const deriveOrigin = (url) => new URL(url).origin;

const resolveBackendUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    return `${protocol}//${hostname}:8000`;
  }

  return 'http://127.0.0.1:8000';
};

export const BACKEND_URL = resolveBackendUrl();
export const MEDIA_BASE_URL = process.env.REACT_APP_MEDIA_URL || deriveOrigin(BACKEND_URL);
export const WS_BACKEND_URL = BACKEND_URL.replace(/^http/, 'ws');

// 401 토큰 만료 자동 처리 인터셉터
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('announcer_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getAuthHeader = () => {
  const savedUser = localStorage.getItem('announcer_user');
  if (!savedUser) return {};
  const { access_token } = JSON.parse(savedUser);
  return { headers: { Authorization: `Bearer ${access_token}` } };
};

export const getAccessToken = () => {
  const savedUser = localStorage.getItem('announcer_user');
  if (!savedUser) return null;
  return JSON.parse(savedUser).access_token;
};

export default axios;
