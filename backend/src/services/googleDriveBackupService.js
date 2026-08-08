'use strict';

const crypto = require('crypto');
const fs = require('fs');

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function loadServiceAccountCredentials() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS no esta configurado');
  }

  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  } catch (error) {
    throw new Error(`No se pudo leer la credencial de Google: ${error.message}`, {
      cause: error,
    });
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('La credencial de Google no contiene client_email/private_key');
  }

  return {
    clientEmail: credentials.client_email,
    privateKey: credentials.private_key,
    tokenUri: credentials.token_uri || 'https://oauth2.googleapis.com/token',
  };
}

async function readError(response) {
  const body = await response.text();
  return body.slice(0, 2000) || `${response.status} ${response.statusText}`;
}

async function getAccessToken(credentials = loadServiceAccountCredentials()) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: DRIVE_SCOPE,
      aud: credentials.tokenUri,
      iat: now - 30,
      exp: now + 3600,
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsignedToken), credentials.privateKey);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch(credentials.tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth rechazo la credencial: ${await readError(response)}`);
  }

  const token = await response.json();
  if (!token.access_token) throw new Error('Google OAuth no devolvio access_token');
  return token.access_token;
}

async function uploadFile({ accessToken, filePath, folderId, filename }) {
  const stats = fs.statSync(filePath);
  const startResponse = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,createdTime`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'application/octet-stream',
        'x-upload-content-length': String(stats.size),
      },
      body: JSON.stringify({
        name: filename,
        parents: [folderId],
        mimeType: 'application/octet-stream',
      }),
    }
  );

  if (!startResponse.ok) {
    throw new Error(`Google Drive no inicio la carga: ${await readError(startResponse)}`);
  }

  const uploadUrl = startResponse.headers.get('location');
  if (!uploadUrl) throw new Error('Google Drive no devolvio la URL de carga');

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/octet-stream',
      'content-length': String(stats.size),
    },
    body: fs.createReadStream(filePath),
    duplex: 'half',
  });

  if (!uploadResponse.ok) {
    throw new Error(`Google Drive rechazo la carga: ${await readError(uploadResponse)}`);
  }

  return uploadResponse.json();
}

function quoteDriveQueryValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function listFolderFiles({ accessToken, folderId, driveId }) {
  const files = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({
      q: `'${quoteDriveQueryValue(folderId)}' in parents and trashed = false`,
      spaces: 'drive',
      pageSize: '1000',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      fields: 'nextPageToken,files(id,name,createdTime)',
    });
    if (driveId) {
      params.set('corpora', 'drive');
      params.set('driveId', driveId);
    }
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Google Drive no pudo listar respaldos: ${await readError(response)}`);
    }

    const result = await response.json();
    files.push(...(result.files || []));
    pageToken = result.nextPageToken || '';
  } while (pageToken);

  return files;
}

async function deleteFile({ accessToken, fileId }) {
  const response = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ trashed: true }),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Google Drive no pudo enviar un respaldo antiguo a la papelera: ${await readError(response)}`
    );
  }
}

async function cleanupRemoteBackups({
  accessToken,
  folderId,
  driveId,
  filenamePrefix,
  retentionDays,
}) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = await listFolderFiles({ accessToken, folderId, driveId });
  const expired = files.filter(
    (file) =>
      file.name?.startsWith(`${filenamePrefix}_`) &&
      file.createdTime &&
      new Date(file.createdTime).getTime() < cutoff
  );

  for (const file of expired) {
    await deleteFile({ accessToken, fileId: file.id });
  }

  return expired.length;
}

async function uploadEncryptedBackup({
  filePath,
  folderId,
  driveId,
  filename,
  filenamePrefix,
  retentionDays,
}) {
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID no esta configurado');

  const accessToken = await getAccessToken();
  const uploaded = await uploadFile({ accessToken, filePath, folderId, filename });
  const deletedCount = await cleanupRemoteBackups({
    accessToken,
    folderId,
    driveId,
    filenamePrefix,
    retentionDays,
  });

  return { uploaded, deletedCount };
}

module.exports = {
  cleanupRemoteBackups,
  getAccessToken,
  loadServiceAccountCredentials,
  uploadEncryptedBackup,
};
