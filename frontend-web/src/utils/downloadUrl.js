export function downloadUrl(url, fileName = 'documento') {
  if (!url) {
    throw new Error('No recibimos una URL de descarga.');
  }

  const targetUrl = new URL(url, window.location.origin).toString();
  const targetOrigin = new URL(targetUrl).origin;
  const sameOrigin = targetOrigin === window.location.origin;
  const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent || '');

  if (isSafari && !sameOrigin) {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const link = document.createElement('a');
  link.href = targetUrl;
  link.download = fileName;
  link.rel = 'noopener noreferrer';
  link.target = sameOrigin ? '_self' : '_blank';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
