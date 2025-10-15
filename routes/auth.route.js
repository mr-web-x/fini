// ============================================
// routes/auth.route.js
// ============================================

import express from 'express';
import authController from '../controllers/authController.js';
import { optionalAuth } from "../middlewares/auth.middleware.js"

// Валидации
import authValidator from '../validation/authValidator.js';

const router = express.Router();

/**
 * @route POST /api/auth/google
 * @desc Авторизация через Google OAuth
 * @access Public
 */
router.post(
  '/google',
  authValidator.validateGoogleAuth,   // ✅ Валидация токена из body
  authController.googleAuth           // ✅ Контроллер
);

// ------------------------------------------------------------
router.get('/google', (req, res) => {
  res.json({
    success: true,
    message: 'Google OAuth endpoint работает ✅ (GET)',  // TEST
  });
});

/**
 * @route POST /api/auth/refresh
 * @desc Обновление JWT токена
 * @access Public
 */
router.post(
  '/refresh',
  authValidator.validateRefreshToken, // ✅ Проверка поля token
  authController.refreshToken         // ✅ Контроллер
);

/**
 * @route POST /api/auth/logout
 * @desc Выход из системы
 * @access Private
 */
router.post(
  '/logout',
  optionalAuth,                       // ✅ Можно вызвать с токеном или без
  authController.logout               // ✅ Контроллер
);

export default router;