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

// Unified routing payload v2 (frontends must send ONLY these fields)
export interface UnifiedEvalRoutingParams {
  /** operator: 算子评测 | model_deployment: 模型部署评测 */
  task: 'operator' | 'model_deployment';
  /** 子场景：operator_accuracy / operator_accuracy_performance / llm / speech_recognition / ... */
  scenario: string;
  /** 芯片 tag（与资产 tags 对齐），例如 huawei_910c */
  chips: string;
  /** 芯片数量 */
  chip_num: number;
  /** 镜像资产数据库 id（模型部署必填，算子评测不传） */
  image_id?: number;
  /** 工具资产数据库 id（算子/模型部署都可填，算子评测必填） */
  tool_id?: number;

  // Meta
  name: string;
  description?: string;
  visibility?: 'private' | 'platform';
  priority: 'high' | 'medium' | 'low';

  // Operator-only options
  operator_count?: number;
  operator_categories?: string[];
  operator_lib_id?: number;
}

type CreateEvalParams = UnifiedEvalRoutingParams;

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

export function setEvaluationPostActions(id: string, data: { save_image: boolean; include_in_ranking: boolean }) {
  return api.post(`/evaluations/${id}/post-actions`, data);
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
