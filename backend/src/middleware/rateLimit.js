// ============================================================
// SKNOMINA - Rate limiting simple en memoria
// ============================================================

function createRateLimiter({ windowMs, max, keyPrefix }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip}:${req.path}`;
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    hits.set(key, current);

    if (current.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEDIDO',
        message: 'Demasiados intentos. Intente nuevamente mas tarde.',
        correlationId: req.correlationId,
        retryAfterSeconds,
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
