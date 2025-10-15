// ============================================
// routes/category.route.js
// ============================================

import express from 'express';
import categoryController from '../controllers/categoryController.js';
import {
    authenticate,
    requireAdmin
} from '../middlewares/auth.middleware.js';

// Валидации
import categoryValidator from '../validation/categoryValidator.js';

const router = express.Router();

// ==================== ПУБЛИЧНЫЕ МАРШРУТЫ ====================

/**
 * @route GET /api/categories
 * @desc Получение всех категорий
 * @access Public
 */
router.get(
    '/',
    categoryController.getAllCategories
);

/**
 * @route GET /api/categories/slug/:slug
 * @desc Получение категории по slug
 * @access Public
 */
router.get(
    '/slug/:slug',
    categoryController.getCategoryBySlug
);

/**
 * @route GET /api/categories/:id
 * @desc Получение категории по ID
 * @access Public
 */
router.get(
    '/:id',
    categoryController.getCategoryById
);

/**
 * @route GET /api/categories/:id/stats
 * @desc Получение статистики категории
 * @access Public
 */
router.get(
    '/:id/stats',
    categoryController.getCategoryStats
);

// ==================== АДМИНСКИЕ МАРШРУТЫ ====================

/**
 * @route POST /api/categories
 * @desc Создание новой категории
 * @access Private (admin only)
 */
router.post(
    '/',
    authenticate,
    requireAdmin,
    categoryValidator.validateCreateCategory,
    categoryController.createCategory
);

/**
 * @route PUT /api/categories/:id
 * @desc Обновление категории
 * @access Private (admin only)
 */
router.put(
    '/:id',
    authenticate,
    requireAdmin,
    categoryValidator.validateUpdateCategory,
    categoryController.updateCategory
);

/**
 * @route DELETE /api/categories/:id
 * @desc Удаление категории
 * @access Private (admin only)
 */
router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    categoryController.deleteCategory
);

export default router;