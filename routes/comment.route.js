// ============================================
// routes/comment.route.js
// ============================================

import express from 'express';
import commentController from '../controllers/commentController.js';
import {
    authenticate,
    requireAdmin
} from '../middlewares/auth.middleware.js';

// Валидации
import commentValidator from '../validation/commentValidator.js';
import commonValidator from '../validation/commonValidator.js';

const router = express.Router();

// ==================== ПУБЛИЧНЫЕ МАРШРУТЫ ====================

/**
 * @route GET /api/comments/article/:articleId
 * @desc Получение комментариев к статье
 * @access Public
 */
router.get(
    '/article/:articleId',
    commonValidator.validatePagination,
    commentController.getArticleComments
);

// ==================== ПРИВАТНЫЕ МАРШРУТЫ ====================

/**
 * @route GET /api/comments
 * @desc Получение комментариев пользователя по query параметру author
 * @query ?author=userId или ?author=me (для текущего пользователя)
 * @access Private
 */
router.get(
    '/',
    authenticate,
    commonValidator.validatePagination,
    commentController.getMyComments
);

/**
 * @route GET /api/comments/:id
 * @desc Получение комментария по ID
 * @access Public
 */
router.get(
    '/:id',
    commentController.getCommentById
);

/**
 * @route POST /api/comments
 * @desc Создание нового комментария
 * @access Private
 */
router.post(
    '/',
    authenticate,
    commentValidator.validateCreateComment,
    commentController.createComment
);

/**
 * @route PUT /api/comments/:id
 * @desc Обновление комментария
 * @access Private (автор комментария)
 */
router.put(
    '/:id',
    authenticate,
    commentValidator.validateUpdateComment,
    commentController.updateComment
);

/**
 * @route DELETE /api/comments/:id
 * @desc Удаление комментария
 * @access Private (автор комментария или admin)
 */
router.delete(
    '/:id',
    authenticate,
    commentController.deleteComment
);

// ==================== АДМИНСКИЕ МАРШРУТЫ ====================

/**
 * @route GET /api/comments/all/list
 * @desc Получение всех комментариев (включая удаленные)
 * @access Private (admin only)
 */
router.get(
    '/all/list',
    authenticate,
    requireAdmin,
    commonValidator.validatePagination,
    commentController.getAllComments
);

/**
 * @route DELETE /api/comments/:id/moderate
 * @desc Модерация (удаление) комментария админом
 * @access Private (admin only)
 */
router.delete(
    '/:id/moderate',
    authenticate,
    requireAdmin,
    commentController.moderateDeleteComment
);

/**
 * @route GET /api/comments/stats/all
 * @desc Получение статистики по комментариям
 * @access Private (admin only)
 */
router.get(
    '/stats/all',
    authenticate,
    requireAdmin,
    commentController.getStatistics
);

export default router;