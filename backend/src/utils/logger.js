function normalizeMeta(meta = {}) {
  return {
    code: meta.code || 'APP_LOG',
    statusCode: meta.statusCode || 200,
    correlationId: meta.correlationId || process.env.CORRELATION_ID || 'system',
    userId: Object.prototype.hasOwnProperty.call(meta, 'userId') ? meta.userId : null,
    ...meta,
  };
}

function write(level, meta, message) {
  const payload = {
    level,
    ...normalizeMeta(meta),
    message,
    timestamp: new Date().toISOString(),
  };
  const line = `${JSON.stringify(payload)}\n`;
  if (level === 'error') {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}

module.exports = {
  info(meta, message = 'Evento informativo') {
    write('info', meta, message);
  },
  warn(meta, message = 'Advertencia operativa') {
    write('warn', meta, message);
  },
  error(meta, message = 'Error operativo') {
    write('error', meta, message);
  },
};
