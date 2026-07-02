const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken, requireRole } = require('../middleware/auth');

function createAuthRoutes({ authRateLimit }) {
  const router = express.Router();

  router.post('/login', authRateLimit, authController.login);
  router.post('/refresh', authController.refreshToken);
  router.post('/public-register', authRateLimit, authController.publicRegister);
  router.post('/password/forgot', authRateLimit, authController.forgotPassword);
  router.post('/password/reset', authRateLimit, authController.resetPassword);
  router.post('/email-verification/request', authRateLimit, authController.requestEmailVerification);
  router.post('/email-verification/resend', authRateLimit, authController.requestEmailVerification);
  router.post('/email-verification/confirm', authRateLimit, authController.confirmEmailVerification);
  router.post('/register', authRateLimit, authenticateToken, requireRole('superadmin', 'owner'), authController.register);
  router.get('/email-verification/status', authenticateToken, authController.emailVerificationStatus);
  router.get('/session-context', authenticateToken, authController.sessionContext);

  return router;
}

module.exports = createAuthRoutes;
