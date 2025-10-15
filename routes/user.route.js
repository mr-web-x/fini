// ============================================
// routes/user.route.js
// ============================================

import express from 'express';
import userController from '../controllers/userController.js';
import {
    authenticate,
    checkProfileOwnership
} from '../middlewares/auth.middleware.js';

// Валидации
import authValidator from '../validation/authValidator.js';

const router = express.Router();

/**
 * @route GET /api/users/me
 * @desc Получение информации о текущем пользователе
 * @access Private
 */
router.get(
    '/me',
    authenticate,                       // ✅ Проверка JWT токена
    userController.getMe                // ✅ Контроллер
);

/**
 * @route PUT /api/users/profile/:id
 * @desc Обновление профиля пользователя
 * @access Private (только владелец профиля или админ)
 */
router.put(
    '/profile/:id',
    authenticate,                       // ✅ Проверка JWT токена
    checkProfileOwnership,              // ✅ Проверка владельца профиля
    authValidator.validateUpdateProfile,// ✅ Проверка валидности данных
    userController.updateProfile        // ✅ Контроллер
);

export default router;