import api from './index';

export function getBenchmarkOperators(params?: {
  page?: number;
  page_size?: number;
  category?: string;
  keyword?: string;
}) {
  return api.get('/benchmark/operators', { params });
}

export function getBenchmarkOperatorDetail(id: number) {
  return api.get(`/benchmark/operators/${id}`);
}

export function getBenchmarkCategories() {
  return api.get('/benchmark/operators/categories');
}

export function getBenchmarkSummary() {
  return api.get('/benchmark/summary');
}
