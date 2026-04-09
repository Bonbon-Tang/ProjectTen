import axios from 'axios';
import { message } from 'antd';
import { getHttpErrorMessage } from '@/utils/error';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RequestConfigWithToast {
  skipErrorToast?: boolean;
}

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== undefined && res.code !== 0 && res.code !== 200) {
      const err = new Error(res.message || '请求失败');
      message.error(res.message || '请求失败');
      return Promise.reject(err);
    }
    return res;
  },
  (error) => {
    console.error('[API Error]', error);

    const config = (error.config || {}) as RequestConfigWithToast;
    const status = error.response?.status;
    const errorText = getHttpErrorMessage(error, '请求失败');

    if (status === 401) {
      if (!config.skipErrorToast) {
        message.error('登录已过期，请重新登录');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (!config.skipErrorToast) {
      message.error(errorText);
    }

    return Promise.reject(error);
  },
);

export default api;
