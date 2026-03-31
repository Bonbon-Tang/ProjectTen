import api from './index';

export interface UserQuery {
  page?: number;
  page_size?: number;
  status?: string;
  user_type?: string;
  keyword?: string;
}

export function getUsers(params?: UserQuery) {
  return api.get('/users/', { params });
}

export function getUserById(id: string | number) {
  return api.get(`/users/${id}`);
}

export function deleteUser(id: string | number) {
  return api.delete(`/users/${id}`);
}
