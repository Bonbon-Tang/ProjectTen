import api from './index';

export interface RankingQuery {
  task_type: string;
  eval_method?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}

export function getBenchmarkScenarios() {
  return api.get('/model-benchmark/scenarios');
}

export function getModelBenchmarkRanking(params: RankingQuery) {
  return api.get('/model-benchmark/ranking', { params });
}

export function getModelBenchmarkSummary() {
  return api.get('/model-benchmark/summary');
}

export function getAvailableImages(task_type?: string, device_type?: string) {
  return api.get('/model-benchmark/images', { params: { task_type, device_type } });
}

export function getAvailableToolsets(task_type?: string) {
  return api.get('/model-benchmark/toolsets', { params: { task_type } });
}
