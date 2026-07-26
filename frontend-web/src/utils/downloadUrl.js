import { authenticatedApi } from '../services/authenticatedApi';
import { downloadBlob } from './downloadBlob';

export async function downloadUrl(url, fileName = 'documento') {
  if (!url) {
    throw new Error('No recibimos una URL de descarga.');
  }

  if (typeof url === 'string' && url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  try {
    const response = await authenticatedApi.get(url, { responseType: 'blob' });
    const contentDisposition = response.headers['content-disposition'];
    let finalFileName = fileName;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        finalFileName = match[1];
      }
    }
    downloadBlob(response.data, finalFileName);
  } catch (err) {
    console.warn('[DOWNLOAD] Fallback direct fetch/link download', err?.message);
    const targetUrl = new URL(url, window.location.origin).toString();
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const blob = await res.blob();
        downloadBlob(blob, fileName);
        return;
      }
    } catch (_ignore) {
      // Ignore error and fall back to anchor click
    }
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
