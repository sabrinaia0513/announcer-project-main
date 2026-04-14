import axios from 'axios';

export const BACKEND_URL = "http://43.201.164.155:8000";

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
