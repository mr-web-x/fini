// ============================================
// routes/adminUser.route.js
// ============================================

import express from 'express';
import adminUserController from '../controllers/adminUserController.js';
import {
    authenticate,
    requireAdmin
} from '../middlewares/auth.middleware.js';

// Валидации
import adminUserValidator from '../validation/adminUserValidator.js';

const router = express.Router();

// ==================== ВСЕ РОУТЫ ТРЕБУЮТ ADMIN ПРАВА ====================

// ==================== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ====================

/**
 * @route GET /api/admin/users/stats
 * @desc Получение статистики пользователей
 * @access Private (admin only)
 * ВАЖНО: Должен быть ПЕРЕД /api/admin/users/:id
 */
router.get(
    '/stats',
    authenticate,
    requireAdmin,
    adminUserController.getUserStatistics
);

/**
 * @route GET /api/admin/users/search
 * @desc Поиск пользователей
 * @query ?q=запрос&limit=10&role=author
 * @access Private (admin only)
 * ВАЖНО: Должен быть ПЕРЕД /api/admin/users/:id
 */
router.get(
    '/search',
    authenticate,
    requireAdmin,
    adminUserValidator.validateSearch,
    adminUserController.searchUsers
);

/**
 * @route GET /api/admin/users/:id
 * @desc Получение пользователя по ID
 * @access Private (admin only)
 */
router.get(
    '/:id',
    authenticate,
    requireAdmin,
    adminUserController.getUserById
);

/**
 * @route GET /api/admin/users
 * @desc Получение всех пользователей с фильтрами
 * @query ?page=1&limit=20&role=author&search=имя&isBlocked=false
 * @access Private (admin only)
 */
router.get(
    '/',
    authenticate,
    requireAdmin,
    adminUserController.getAllUsers
);

// ==================== УПРАВЛЕНИЕ БЛОКИРОВКАМИ ====================

/**
 * @route POST /api/admin/users/:id/block
 * @desc Блокировка пользователя
 * @body { reason: string, until?: date }
 * @access Private (admin only)
 */
router.post(
    '/:id/block',
    authenticate,
    requireAdmin,
    adminUserValidator.validateBlockUser,
    adminUserController.blockUser
);

/**
 * @route POST /api/admin/users/:id/unblock
 * @desc Разблокировка пользователя
 * @access Private (admin only)
 */
router.post(
    '/:id/unblock',
    authenticate,
    requireAdmin,
    adminUserController.unblockUser
);

// ==================== УПРАВЛЕНИЕ РОЛЯМИ ====================

/**
 * @route PUT /api/admin/users/:id/role
 * @desc Изменение роли пользователя (только user ⟷ author)
 * @body { role: 'user' | 'author' }
 * @access Private (admin only)
 * @note НЕЛЬЗЯ назначить роль 'admin' через API
 */
router.put(
    '/:id/role',
    authenticate,
    requireAdmin,
    adminUserValidator.validateChangeRole,
    adminUserController.changeUserRole
);

// ==================== УДАЛЕНИЕ ====================

/**
 * @route DELETE /api/admin/users/:id
 * @desc Удаление пользователя (мягкое удаление - блокировка навсегда)
 * @access Private (admin only)
 */
router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    adminUserController.deleteUser
);

export default router;