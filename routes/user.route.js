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

// ==================== ПУБЛИЧНЫЕ МАРШРУТЫ ====================
// ВАЖНО: специфичные роуты должны быть ПЕРЕД динамическими (:slug, :id)

/**
 * @route GET /api/users/authors
 * @desc Получение всех авторов (публичный доступ)
 * @query ?page=1&limit=12&search=имя
 * @access Public
 */
router.get(
    '/authors',
    userController.getAuthors
);

/**
 * @route GET /api/users/authors/:slug
 * @desc Получение автора по slug (публичный доступ)
 * @access Public
 */
router.get(
    '/authors/:slug',
    userController.getAuthorBySlug
);

// ==================== ПРИВАТНЫЕ МАРШРУТЫ ====================

/**
 * @route GET /api/users/me
 * @desc Получение информации о текущем пользователе
 * @access Private
 */
router.get(
    '/me',
    authenticate,
    userController.getMe
);

/**
 * @route PUT /api/users/profile/:id
 * @desc Обновление профиля пользователя
 * @access Private (только владелец профиля или админ)
 */
router.put(
    '/profile/:id',
    authenticate,
    checkProfileOwnership,
    authValidator.validateUpdateProfile,
    userController.updateProfile
);

export default router;