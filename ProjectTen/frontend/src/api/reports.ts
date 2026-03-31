import api from './index';

export interface ReportQuery {
  page?: number;
  page_size?: number;
  status?: string;
  keyword?: string;
}

export interface ArchiveQuery {
  page?: number;
  page_size?: number;
  keyword?: string;
}

export function getReports(params: ReportQuery) {
  return api.get('/reports/', { params });
}

export function getReportById(id: string) {
  return api.get(`/reports/${id}`);
}

export function createReport(data: any) {
  return api.post('/reports/', data);
}

export function deleteReport(id: string) {
  return api.delete(`/reports/${id}`);
}

export function downloadReport(id: string) {
  return api.get(`/reports/${id}/download`, { responseType: 'blob' });
}

export function compareReports(ids: string[]) {
  return api.post('/reports/compare', { report_ids: ids });
}

// 存档相关 API
export function archiveReport(id: string) {
  return api.post(`/reports/${id}/archive`);
}

export function shareReport(id: string, isPublic: boolean) {
  return api.post(`/reports/${id}/share`, { is_public: isPublic });
}

export function getArchives(params?: ArchiveQuery) {
  return api.get('/reports/archives', { params });
}

export function deleteArchive(id: string) {
  return api.delete(`/reports/archives/${id}`);
}
