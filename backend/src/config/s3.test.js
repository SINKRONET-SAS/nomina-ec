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

describe('configuracion S3 AWS SDK v3', () => {
  beforeEach(() => {
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
