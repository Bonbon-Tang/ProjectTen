import api from './index';

export interface TenantQuery {
  page?: number;
  page_size?: number;
  keyword?: string;
  status?: string;
}

export function getTenants(params: TenantQuery) {
  return api.get('/tenants/', { params });
}

export function getTenantById(id: string) {
  return api.get(`/tenants/${id}`);
}

export function createTenant(data: any) {
  return api.post('/tenants/', data);
}

export function updateTenant(id: string, data: any) {
  return api.put(`/tenants/${id}`, data);
}

export function deleteTenant(id: string | number) {
  return api.delete(`/tenants/${id}`);
}

export function getTenantMembers(id: string, params?: any) {
  return api.get(`/tenants/${id}/members`, { params });
}
