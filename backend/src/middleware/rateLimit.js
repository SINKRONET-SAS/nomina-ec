// ============================================================
// PLAN HAIKY - Rate limiting simple en memoria
// ============================================================

function createRateLimiter({ windowMs, max, keyPrefix }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.ip}`;
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    hits.set(key, current);

    if (current.count > max) {
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEDIDO',
        message: 'Demasiados intentos. Intente nuevamente mas tarde.',
        correlationId: req.correlationId,
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
