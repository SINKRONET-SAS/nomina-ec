export const PDF_MAX_BYTES = 8 * 1024 * 1024;
export const PDF_MAX_PAGES = 30;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_WIDTH = 5000;
export const IMAGE_MAX_HEIGHT = 5000;

function error(message) {
  return new Error(message);
}

export async function validatePdfFile(file) {
  if (!file || file.type !== 'application/pdf') {
    throw error('Adjunta un archivo PDF.');
  }
  if (file.size > PDF_MAX_BYTES) {
    throw error('El PDF debe pesar hasta 8 MB.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder('ascii').decode(bytes.slice(0, 5));
  if (header !== '%PDF-') {
    throw error('El archivo no tiene una cabecera PDF valida.');
  }
  const text = new TextDecoder('latin1').decode(bytes);
  const pages = (text.match(/\/Type\s*\/Page\b/g) || []).length;
  if (pages > PDF_MAX_PAGES) {
    throw error(`El PDF debe tener hasta ${PDF_MAX_PAGES} paginas.`);
  }
  return { sizeBytes: file.size, pages: pages || null };
}

export function validateImageFile(file, allowedTypes) {
  if (!file || !allowedTypes.has(file.type)) {
    throw error('Adjunta una imagen JPG, PNG o WebP.');
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw error('La imagen debe pesar hasta 5 MB.');
  }
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.width > IMAGE_MAX_WIDTH || image.height > IMAGE_MAX_HEIGHT) {
        reject(error(`La imagen debe tener hasta ${IMAGE_MAX_WIDTH} x ${IMAGE_MAX_HEIGHT} pixeles.`));
        return;
      }
      resolve({ sizeBytes: file.size, width: image.width, height: image.height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(error('No se pudo verificar la resolucion de la imagen.'));
    };
    image.src = objectUrl;
  });
}
