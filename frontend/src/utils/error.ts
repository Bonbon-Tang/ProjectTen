import type { AxiosError } from 'axios';

interface ErrorPayload {
  message?: string;
  detail?: string | { message?: string; detail?: string };
  errors?: Array<{ message?: string }>;
}

function normalizeDetail(detail?: ErrorPayload['detail']): string | undefined {
  if (!detail) return undefined;
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object') {
    return detail.message || detail.detail;
  }
  return undefined;
}

export function extractErrorMessage(error: unknown, fallback = '请求失败'): string {
  const axiosError = error as AxiosError<ErrorPayload> | undefined;
  const data = axiosError?.response?.data;

  const candidates = [
    data?.message,
    normalizeDetail(data?.detail),
    data?.errors?.find((item) => item?.message)?.message,
    axiosError?.message,
  ];

  const raw = candidates.find((item) => typeof item === 'string' && item.trim());
  if (!raw) return fallback;

  const text = raw.trim();

  if (text === 'Network Error') return '网络异常，请检查网络连接';
  if (text.toLowerCase().includes('timeout')) return '请求超时，请稍后重试';

  return text;
}

export function getHttpErrorMessage(error: unknown, fallback = '请求失败'): string {
  const axiosError = error as AxiosError<ErrorPayload> | undefined;
  const status = axiosError?.response?.status;
  const detail = extractErrorMessage(error, fallback);

  switch (status) {
    case 400:
      return detail || '请求参数有误';
    case 401:
      return '登录已过期，请重新登录';
    case 403:
      return detail !== fallback ? detail : '没有访问权限';
    case 404:
      return detail !== fallback ? detail : '请求的资源不存在';
    case 409:
      return detail || '请求发生冲突';
    case 422:
      return detail || '提交内容校验失败';
    case 500:
    case 502:
    case 503:
    case 504:
      return detail !== fallback ? detail : '服务暂时不可用，请稍后重试';
    default:
      return detail;
  }
}
