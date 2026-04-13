import api from './index';

export interface RankingQuery {
  scenario: string;
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

export function getAvailableImages(scenario?: string, chips?: string) {
  return api.get('/model-benchmark/images', { params: { scenario, chips } });
}

export function getAvailableToolsets(scenario?: string) {
  return api.get('/model-benchmark/toolsets', { params: { scenario } });
}
