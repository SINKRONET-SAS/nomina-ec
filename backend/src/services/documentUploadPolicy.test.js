const {
  assertImage,
  assertPdf,
  PDF_MAX_PAGES,
} = require('./documentUploadPolicy');

describe('documentUploadPolicy', () => {
  test('acepta PDF con cabecera valida y registra paginas', () => {
    const buffer = Buffer.from('%PDF-1.7\n/Type /Page\n%%EOF', 'latin1');
    expect(assertPdf(buffer)).toEqual(expect.objectContaining({ sizeBytes: buffer.length, pages: 1 }));
  });

  test('rechaza PDF que excede el maximo de paginas', () => {
    const buffer = Buffer.from(`%PDF-1.7\n${'/Type /Page\n'.repeat(PDF_MAX_PAGES + 1)}%%EOF`, 'latin1');
    expect(() => assertPdf(buffer)).toThrow('paginas');
  });

  test('verifica dimensiones de imagen PNG', () => {
    const buffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
    expect(assertImage(buffer, 'image/png')).toEqual(expect.objectContaining({ width: 1, height: 1 }));
    buffer.writeUInt32BE(5001, 16);
    expect(() => assertImage(buffer, 'image/png')).toThrow('5000');
  });
});
