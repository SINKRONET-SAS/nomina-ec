const AppError = require('./AppError');

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_DATA_URL_REGEX = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOI = Buffer.from([0xff, 0xd8]);

function detectImageType(buffer) {
  if (buffer.length >= 8 && buffer.slice(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buffer.length >= 2 && buffer.slice(0, 2).equals(JPEG_SOI)) return 'jpeg';
  return null;
}

function validateLogoDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new AppError('Logo requerido como data URL base64.', {
      code: 'LOGO_DATA_URL_REQUERIDO',
      statusCode: 400,
    });
  }

  const match = dataUrl.match(LOGO_DATA_URL_REGEX);
  if (!match) {
    throw new AppError('Formato de logo inválido. Usa data:image/png;base64,... o data:image/jpeg;base64,...', {
      code: 'LOGO_FORMATO_INVALIDO',
      statusCode: 400,
    });
  }

  const mimeType = match[1].toLowerCase();
  const base64Content = match[3];
  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.length > MAX_LOGO_SIZE_BYTES) {
    throw new AppError(`El logo excede el tamaño máximo de ${MAX_LOGO_SIZE_BYTES / 1024 / 1024}MB.`, {
      code: 'LOGO_TAMANO_EXCEDIDO',
      statusCode: 400,
    });
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    throw new AppError('El archivo no es una imagen PNG o JPEG válida.', {
      code: 'LOGO_TIPO_NO_SOPORTADO',
      statusCode: 400,
    });
  }

  return { mimeType, buffer, base64Content, detected };
}

module.exports = {
  MAX_LOGO_SIZE_BYTES,
  detectImageType,
  validateLogoDataUrl,
};
