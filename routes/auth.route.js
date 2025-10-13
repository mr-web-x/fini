// ============================================
// routes/auth.route.js
// ============================================

import express from 'express';
import authController from '../controllers/authController.js';
import {
  authenticate,
  checkProfileOwnership,
  optionalAuth
} from '../middlewares/auth.js';

// Валидации
import { authValidator, } from "../Validation/authValidator.js"



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

/**
 * @route GET /api/auth/me
 * @desc Получение информации о текущем пользователе
 * @access Private
 */
router.get(
  '/me',
  authenticate,                       // ✅ Проверка JWT токена
  authController.getMe                // ✅ Контроллер
);

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
 * @route PUT /api/auth/profile/:id
 * @desc Обновление профиля пользователя
 * @access Private (только владелец профиля или админ)
 */
router.put(
  '/profile/:id',
  authenticate,                       // ✅ Проверка JWT токена
  checkProfileOwnership,              // ✅ Проверка владельца профиля
  authValidator.validateUpdateProfile,// ✅ Проверка валидности данных
  authController.updateProfile        // ✅ Контроллер
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
