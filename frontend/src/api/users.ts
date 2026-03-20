import api from './index';

export interface UserQuery {
  page?: number;
  page_size?: number;
  keyword?: string;
  role?: string;
  status?: string;
}

export function getUsers(params: UserQuery) {
  return api.get('/users/', { params });
}

export function getUserById(id: string) {
  return api.get(`/users/${id}`);
}

export function createUser(data: any) {
  return api.post('/users/', data);
}

export function updateUser(id: string, data: any) {
  return api.put(`/users/${id}`, data);
}

export function deleteUser(id: string) {
  return api.delete(`/users/${id}`);
}

export function resetUserPassword(id: string) {
  return api.post(`/users/${id}/reset-password`);
}
