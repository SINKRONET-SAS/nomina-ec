const jwt = require('jsonwebtoken');

const JWT_ALGORITHM = 'HS256';
const INSECURE_DEFAULTS = new Set([
  'your-super-secret-jwt-key',
  'your-super-secret-jwt-key-change-in-production',
]);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || INSECURE_DEFAULTS.has(secret)) {
    throw new Error('JWT_SECRET seguro es obligatorio. Configura una clave privada fuera del repositorio.');
  }

  if (String(secret).length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  return secret;
}

function signJwt(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    ...options,
  });
}

function verifyJwt(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
  });
}

module.exports = {
  JWT_ALGORITHM,
  getJwtSecret,
  signJwt,
  verifyJwt,
};
