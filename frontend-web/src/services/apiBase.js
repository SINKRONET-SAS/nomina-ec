const rawApiUrl = import.meta.env?.VITE_API_URL || '/api';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export function normalizeApiUrl(value = rawApiUrl) {
  const baseUrl = trimTrailingSlash(value || '/api');

  if (!baseUrl || baseUrl === '/') {
    return '/api';
  }

  if (baseUrl === '/api' || baseUrl.endsWith('/api')) {
    return baseUrl;
  }

  return `${baseUrl}/api`;
}

export const API_URL = normalizeApiUrl(rawApiUrl);
