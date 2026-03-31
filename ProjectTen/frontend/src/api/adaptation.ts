import api from './index';

export interface AdaptationCreateParams {
  name: string;
  image_id: number;
  device_type: string;
  device_count: number;
  test_mode: string;
  precision: string;
  save_image: boolean;
  saved_image_name?: string;
  save_notes?: string;
  config?: Record<string, any>;
}

export function getAdaptations(params?: { page?: number; page_size?: number }) {
  return api.get('/adaptation/', { params });
}

export function createAdaptation(data: AdaptationCreateParams) {
  return api.post('/adaptation/', data);
}

export function setAdaptationPostActions(id: string, data: { save_image: boolean; include_in_ranking: boolean; saved_image_name?: string }) {
  return api.post(`/adaptation/${id}/post-actions`, data);
}

export function getAdaptationById(id: string) {
  return api.get(`/adaptation/${id}`);
}

export function getAdaptationLogs(id: string) {
  return api.get(`/adaptation/${id}/logs`);
}
