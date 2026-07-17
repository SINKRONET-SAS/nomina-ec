// ============================================================
// SKNOMINA - Politica de tamano y dimension para adjuntos
// ============================================================
const PDF_MAX_BYTES = 8 * 1024 * 1024;
const PDF_MAX_PAGES = 30;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MAX_WIDTH = 5000;
const IMAGE_MAX_HEIGHT = 5000;

function policyDetails() {
  return {
    pdfMaxBytes: PDF_MAX_BYTES,
    pdfMaxPages: PDF_MAX_PAGES,
    imageMaxBytes: IMAGE_MAX_BYTES,
    imageMaxWidth: IMAGE_MAX_WIDTH,
    imageMaxHeight: IMAGE_MAX_HEIGHT,
  };
}

function stripDataUrl(value) {
  return String(value || '').replace(/^data:[^;]+;base64,/i, '').trim();
}

function decodeBase64(value, { code = 'DOCUMENTO_BASE64_INVALIDO', label = 'El archivo' } = {}) {
  const clean = stripDataUrl(value);
  if (!clean || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) {
    const error = new Error(`${label} no contiene base64 valido.`);
    error.code = code;
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(clean, 'base64');
  if (buffer.length === 0) {
    const error = new Error(`${label} esta vacio.`);
    error.code = code;
    error.statusCode = 400;
    throw error;
  }
  return buffer;
}

function countPdfPages(buffer) {
  const matches = buffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : null;
}

function assertPdf(buffer, { label = 'El PDF' } = {}) {
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    const error = new Error(`${label} no tiene una cabecera PDF valida.`);
    error.code = 'DOCUMENTO_PDF_INVALIDO';
    error.statusCode = 400;
    throw error;
  }
  if (buffer.length > PDF_MAX_BYTES) {
    const error = new Error(`${label} debe pesar hasta 8 MB.`);
    error.code = 'DOCUMENTO_PDF_TAMANO_INVALIDO';
    error.statusCode = 400;
    error.details = policyDetails();
    throw error;
  }
  const pages = countPdfPages(buffer);
  if (pages !== null && pages > PDF_MAX_PAGES) {
    const error = new Error(`${label} debe tener hasta ${PDF_MAX_PAGES} paginas.`);
    error.code = 'DOCUMENTO_PDF_PAGINAS_INVALIDAS';
    error.statusCode = 400;
    error.details = { ...policyDetails(), pages };
    throw error;
  }
  return { sizeBytes: buffer.length, pages };
}

function readPngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    const isSof = marker >= 0xc0 && marker <= 0xc3;
    if (isSof || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    offset += segmentLength;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  if (buffer.toString('ascii', 12, 16) !== 'VP8X') return null;
  return {
    width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16),
    height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16),
  };
}

function imageDimensions(buffer, mimeType) {
  if (mimeType === 'image/png') return readPngDimensions(buffer);
  if (mimeType === 'image/jpeg') return readJpegDimensions(buffer);
  if (mimeType === 'image/webp') return readWebpDimensions(buffer);
  return null;
}

function assertImage(buffer, mimeType, { label = 'La imagen' } = {}) {
  if (buffer.length > IMAGE_MAX_BYTES) {
    const error = new Error(`${label} debe pesar hasta 5 MB.`);
    error.code = 'DOCUMENTO_IMAGEN_TAMANO_INVALIDO';
    error.statusCode = 400;
    error.details = policyDetails();
    throw error;
  }
  const dimensions = imageDimensions(buffer, mimeType);
  if (!dimensions) {
    const error = new Error(`${label} no tiene dimensiones validas para verificar su resolucion.`);
    error.code = 'DOCUMENTO_IMAGEN_RESOLUCION_INVALIDA';
    error.statusCode = 400;
    error.details = policyDetails();
    throw error;
  }
  if (dimensions.width > IMAGE_MAX_WIDTH || dimensions.height > IMAGE_MAX_HEIGHT) {
    const error = new Error(`${label} debe tener hasta ${IMAGE_MAX_WIDTH} x ${IMAGE_MAX_HEIGHT} pixeles.`);
    error.code = 'DOCUMENTO_IMAGEN_RESOLUCION_INVALIDA';
    error.statusCode = 400;
    error.details = { ...policyDetails(), dimensions };
    throw error;
  }
  return { sizeBytes: buffer.length, ...dimensions };
}

module.exports = {
  PDF_MAX_BYTES,
  PDF_MAX_PAGES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  assertImage,
  assertPdf,
  decodeBase64,
  imageDimensions,
  policyDetails,
};
