jest.mock('@aws-sdk/client-s3', () => {
  class PutObjectCommand {
    constructor(input) {
      this.input = input;
      this.commandName = 'PutObjectCommand';
    }
  }

  class GetObjectCommand {
    constructor(input) {
      this.input = input;
      this.commandName = 'GetObjectCommand';
    }
  }

  class DeleteObjectCommand {
    constructor(input) {
      this.input = input;
      this.commandName = 'DeleteObjectCommand';
    }
  }

  class S3Client {
    constructor(config) {
      this.config = config;
    }

    send(command) {
      S3Client.calls.push(command);

      if (command.commandName === 'GetObjectCommand') {
        return Promise.resolve({ Body: [Buffer.from('contenido')] });
      }

      return Promise.resolve({});
    }
  }

  S3Client.calls = [];

  return {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://firmada.local/documento.pdf')),
}));

const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

describe('configuracion S3 AWS SDK v3', () => {
  beforeEach(() => {
    process.env.STORAGE_DRIVER = 's3';
    S3Client.calls.length = 0;
  });

  test('sube archivos con PutObjectCommand y conserva URL compatible', async () => {
    process.env.AWS_REGION = 'us-east-1';
    const { s3Upload } = require('./s3');

    const url = await s3Upload(Buffer.from('demo'), 'roles/demo.pdf', 'application/pdf');

    expect(url).toContain('roles/demo.pdf');
    expect(S3Client.calls[0].commandName).toBe('PutObjectCommand');
    expect(S3Client.calls[0].input.ContentType).toBe('application/pdf');
  });

  test('genera URL firmada con presigner v3', async () => {
    const { s3SignedUrl } = require('./s3');

    await expect(s3SignedUrl('roles/demo.pdf')).resolves.toBe('https://firmada.local/documento.pdf');
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
  });

  test('elimina archivos con DeleteObjectCommand', async () => {
    const { s3Delete } = require('./s3');

    await expect(s3Delete('roles/demo.pdf')).resolves.toBeUndefined();
    expect(S3Client.calls[0].commandName).toBe('DeleteObjectCommand');
  });
});

describe('almacenamiento local para desarrollo', () => {
  let tempDir;

  beforeEach(async () => {
    jest.resetModules();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nomina-ec-storage-'));
    process.env.STORAGE_DRIVER = 'local';
    process.env.LOCAL_STORAGE_DIR = tempDir;
    process.env.PORT = '3999';
    process.env.JWT_SECRET = 'test-secret-local-storage';
  });

  afterEach(async () => {
    delete process.env.STORAGE_DRIVER;
    delete process.env.LOCAL_STORAGE_DIR;
    delete process.env.JWT_SECRET;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('guarda archivos locales y devuelve URL firmada temporal', async () => {
    const {
      decodeLocalStorageKey,
      resolveStorageUrl,
      s3Get,
      s3Upload,
      verifyLocalStorageToken,
    } = require('./s3');

    const url = await s3Upload(Buffer.from('demo'), 'documentos/tenant/empleado/contrato.pdf', 'application/pdf');
    const parsedUrl = new URL(url);
    const encodedKey = parsedUrl.pathname.split('/').pop();

    expect(parsedUrl.pathname).toContain('/api/storage/local/');
    expect(decodeLocalStorageKey(encodedKey)).toBe('documentos/tenant/empleado/contrato.pdf');
    expect(verifyLocalStorageToken(encodedKey, parsedUrl.searchParams.get('token'))).toBe(true);
    await expect(s3Get('documentos/tenant/empleado/contrato.pdf')).resolves.toEqual(Buffer.from('demo'));
    expect(resolveStorageUrl(url, 'documentos/tenant/empleado/contrato.pdf')).toContain('/api/storage/local/');
  });
});
