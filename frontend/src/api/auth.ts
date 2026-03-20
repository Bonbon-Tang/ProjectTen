import api from './index';

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  user_type: string;
  organization?: string;
  phone?: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

export function login(data: LoginParams) {
  return api.post<any, { code: number; data: LoginResult; message: string }>('/auth/login', data);
}

export function register(data: RegisterParams) {
  return api.post('/auth/register', data);
}

export function logout() {
  return api.post('/auth/logout');
}

export function getCurrentUser() {
  return api.get('/auth/me');
}

export function refreshToken() {
  return api.post('/auth/refresh');
}
