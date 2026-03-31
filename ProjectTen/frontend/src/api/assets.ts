import api from './index';

export interface AssetQuery {
  page?: number;
  page_size?: number;
  type?: string;       // legacy alias
  asset_type?: string; // backend param name
  category?: string;
  keyword?: string;
  tags?: string;
}

export function getAssets(params: AssetQuery) {
  return api.get('/assets/', { params });
}

export function getAssetById(id: string) {
  return api.get(`/assets/${id}`);
}

export function uploadAsset(formData: FormData, onProgress?: (percent: number) => void) {
  return api.post('/assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
}

export function deleteAsset(id: string) {
  return api.delete(`/assets/${id}`);
}

export function downloadAsset(id: string) {
  return api.get(`/assets/${id}/download`, { responseType: 'blob' });
}

export function getAssetVersions(id: string) {
  return api.get(`/assets/${id}/versions`);
}
