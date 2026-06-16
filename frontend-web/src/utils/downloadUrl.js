export function downloadUrl(url, fileName = 'documento') {
  if (!url) {
    throw new Error('No recibimos una URL de descarga.');
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
