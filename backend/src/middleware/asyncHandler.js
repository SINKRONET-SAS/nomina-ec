// ============================================================
// PLAN HAIKY - Envoltura de controladores async
// ============================================================

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = asyncHandler;
