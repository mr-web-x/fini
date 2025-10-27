// ============================================
// routes/article.route.js
// ============================================

import express from 'express';
import articleController from '../controllers/articleController.js';
import {
    authenticate,
    requireAuthor,
    requireAdmin
} from '../middlewares/auth.middleware.js';

// Валидации
import articleValidator from '../validation/articleValidate.js';
import commonValidator from '../validation/commonValidator.js';

const router = express.Router();

// ==================== ВАЖНО: ПОРЯДОК РОУТОВ! ====================
// Специфичные роуты (search, popular, pending, admin/all) ДОЛЖНЫ быть
// ПЕРЕД динамическими роутами (:id, :slug, :categoryId)
// Иначе Express обработает их как параметры!

// ==================== ПУБЛИЧНЫЕ МАРШРУТЫ ====================

/**
 * @route GET /api/articles/search
 * @desc Поиск статей
 * @access Public
 */
router.get(
    '/search',
    articleController.searchArticles
);

/**
 * @route GET /api/articles/popular/list
 * @desc Получение популярных статей
 * @access Public
 */
router.get(
    '/popular/list',
    articleController.getPopularArticles
);

// ==================== АДМИНСКИЕ МАРШРУТЫ ====================

/**
 * @route GET /api/articles/admin/all
 * @desc Получение ВСЕХ статей в системе (для админа)
 * @access Private (admin only)
 */
router.get(
    '/admin/all',
    authenticate,
    requireAdmin,
    commonValidator.validatePagination,
    articleController.getAllArticlesForAdmin
);

/**
 * @route GET /api/articles/pending/list
 * @desc Получение статей на модерации
 * @access Private (admin only)
 */
router.get(
    '/pending/list',
    authenticate,
    requireAdmin,
    articleController.getPendingArticles
);

/**
 * @route GET /api/articles/stats/all
 * @desc Получение статистики по статьям
 * @access Private (admin only)
 */
router.get(
    '/stats/all',
    authenticate,
    requireAdmin,
    articleController.getStatistics
);

/**
 * @route POST /api/articles/:id/approve
 * @desc Одобрение статьи (pending → published)
 * @access Private (admin only)
 */
router.post(
    '/:id/approve',
    authenticate,
    requireAdmin,
    articleController.approveArticle
);

/**
 * @route POST /api/articles/:id/reject
 * @desc Отклонение статьи (pending → rejected)
 * @access Private (admin only)
 */
router.post(
    '/:id/reject',
    authenticate,
    requireAdmin,
    articleValidator.validateRejectArticle,
    articleController.rejectArticle
);



/**
 * @route POST /api/articles/:id/submit
 * @desc Отправка статьи на модерацию
 * @access Private (author владелец)
 */
router.post(
    '/:id/submit',
    authenticate,
    requireAuthor,
    articleController.submitForReview
);

// ==================== ПУБЛИЧНЫЕ РОУТЫ С ПАРАМЕТРАМИ ====================

/**
 * @route GET /api/articles/slug/:slug
 * @desc Получение статьи по slug
 * @access Public
 */
router.get(
    '/slug/:slug',
    articleController.getArticleBySlug
);

/**
 * @route GET /api/articles/category/:categoryId
 * @desc Получение статей по категории
 * @access Public
 */
router.get(
    '/category/:categoryId',
    commonValidator.validatePagination,
    articleController.getArticlesByCategory
);

/**
 * @route GET /api/articles/author/:authorId
 * @desc Получение статей автора
 * @access Public
 */
router.get(
    '/author/:authorId',
    commonValidator.validatePagination,
    articleController.getArticlesByAuthor
);

/**
 * @route PUT /api/articles/:id/views
 * @desc Увеличение счетчика просмотров
 * @access Public
 */
router.put(
    '/:id/views',
    articleController.incrementViews
);

/**
 * @route GET /api/articles/:id
 * @desc Получение статьи по ID
 * @access Public
 */
router.get(
    '/:id',
    articleController.getArticleById
);

// ==================== ПРИВАТНЫЕ МАРШРУТЫ (AUTHOR/ADMIN) ====================

// ✅ NEW — маршрут для автора (его личные статьи)
router.get(
    '/me',
    authenticate,
    requireAuthor,
    articleController.getMyArticles
);
/**
 * @route POST /api/articles
 * @desc Создание новой статьи
 * @access Private (author, admin)
 */
router.post(
    '/',
    authenticate,
    requireAuthor,
    articleValidator.validateCreateArticle,
    articleController.createArticle
);

/**
 * @route PUT /api/articles/:id
 * @desc Обновление статьи
 * @access Private (author владелец или admin)
 */
router.put(
    '/:id',
    authenticate,
    requireAuthor,
    articleValidator.validateUpdateArticle,
    articleController.updateArticle
);

/**
 * @route DELETE /api/articles/:id
 * @desc Удаление статьи
 * @access Private (author владелец или admin)
 */
router.delete(
    '/:id',
    authenticate,
    requireAuthor,
    articleController.deleteArticle
);

/**
 * @route GET /api/articles
 * @desc Получение всех опубликованных статей
 * @access Public
 */
router.get(
    '/',
    commonValidator.validatePagination,
    articleController.getPublishedArticles
);

export default router;