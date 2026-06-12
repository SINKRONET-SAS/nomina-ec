// ============================================================
// PLAN HAIKY - Error estructurado de aplicacion
// ============================================================

class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'APP_ERROR';
    this.statusCode = options.statusCode || 500;
    this.correlationId = options.correlationId || null;
    this.userId = options.userId || null;
    this.details = options.details || null;
  }
}

module.exports = AppError;
