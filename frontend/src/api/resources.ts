import api from './index';

export function getDeviceList() {
  return api.get('/resources/devices');
}

export function getDeviceDetail(id: number) {
  return api.get(`/resources/devices/${id}`);
}

export function getResourceSummary() {
  return api.get('/resources/summary');
}

export function updateDeviceStatus(id: number, status: string) {
  return api.put(`/resources/devices/${id}/status`, { status });
}
