import api from './index';

export interface EvalQuery {
  page?: number;
  page_size?: number;
  status?: string;
  task_category?: string;
  task_type?: string;
  device_type?: string;
  keyword?: string;
  start_time?: string;
  end_time?: string;
}

export interface CreateEvalParams {
  name: string;
  description?: string;
  task_category: 'operator_test' | 'model_test';
  task_type: string;
  device_type: string;
  device_count: number;
  visibility?: 'private' | 'platform';
  toolset_id?: number;
  priority: 'high' | 'medium' | 'low';
  config?: Record<string, any>;
  operator_count?: number;
  operator_categories?: string[];
  operator_lib_id?: number;
}

export function getEvaluations(params: EvalQuery) {
  return api.get('/evaluations/', { params });
}

export function getEvaluationById(id: string) {
  return api.get(`/evaluations/${id}`);
}

export function createEvaluation(data: CreateEvalParams) {
  return api.post('/evaluations/', data);
}

export function updateEvaluation(id: string, data: any) {
  return api.put(`/evaluations/${id}`, data);
}

export function deleteEvaluation(id: string) {
  return api.delete(`/evaluations/${id}`);
}

export function startEvaluation(id: string) {
  return api.post(`/evaluations/${id}/start`);
}

export function stopEvaluation(id: string) {
  return api.post(`/evaluations/${id}/stop`);
}

export function retryEvaluation(id: string) {
  return api.post(`/evaluations/${id}/retry`);
}

export function getEvaluationLogs(id: string, params?: { offset?: number; limit?: number }) {
  return api.get(`/evaluations/${id}/logs`, { params });
}

export function getEvaluationMetrics(id: string) {
  return api.get(`/evaluations/${id}/metrics`);
}

export function getEvalStats() {
  return api.get('/evaluations/stats');
}

export function batchDeleteEvaluations(taskIds: number[]) {
  return api.post('/evaluations/batch-delete', { task_ids: taskIds });
}
