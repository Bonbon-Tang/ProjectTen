import api from './index';

export interface TenantApplicationCreateParams {
  tenant_name: string;
  contact_person: string;
  contact_email: string;
  description?: string;
}

export interface TenantApplicationApproveParams {
  device_type: string;
  device_count: number;
  duration_hours: number;
}

export function createTenantApplication(data: TenantApplicationCreateParams) {
  return api.post('/tenant-applications/', data);
}

export function getTenantApplications() {
  return api.get('/tenant-applications/');
}

export function approveTenantApplication(id: number | string, data: TenantApplicationApproveParams) {
  return api.post(`/tenant-applications/${id}/approve`, data);
}
