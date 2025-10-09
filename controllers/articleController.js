import articleService from '../services/articleService.js';

class ArticleController {

    // ==================== CRUD ОПЕРАЦИИ ====================

    /**
     * POST /api/articles
     * Создание новой статьи (draft)
     */
    async createArticle(req, res) {
        try {
            const authorId = req.user?.userId;
            const articleData = req.body;

            // Создаём статью через сервис
            const article = await articleService.createArticle(articleData, authorId);

            // Проверяем, что статья создана корректно
            if (!article || !article._id) {
                return res.status(500).json({
                    success: false,
                    message: 'Не удалось создать статью. Попробуйте позже.'
                });
            }

            // Успешный ответ
            return res.status(201).json({
                success: true,
                message: 'Статья успешно создана',
                data: article
            });

        } catch (error) {
            console.error('Ошибка в createArticle:', error);

            // Возврат ошибки
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка при создании статьи'
            });
        }
    }


    /**
     * GET /api/articles/:id
     * Получение статьи по ID
     */
    async getArticleById(req, res) {
        try {
            const { id } = req.params;  

            const article = await articleService.getArticleById(id);

            return res.status(200).json({
                success: true,
                data: article
            });

        } catch (error) {
            console.error('Ошибка в getArticleById:', error);

            return res.status(404).json({
                success: false,
                message: error.message || 'Статья не найдена'
            });
        }
    }

    /**
     * GET /api/articles/slug/:slug
     * Получение статьи по slug
     */
    async getArticleBySlug(req, res) {
        try {
            const { slug } = req.params;

            const article = await articleService.getArticleBySlug(slug);

            return res.status(200).json({
                success: true,
                data: article
            });

        } catch (error) {
            console.error('Ошибка в getArticleBySlug:', error);

            return res.status(404).json({
                success: false,
                message: error.message || 'Статья не найдена'
            });
        }
    }

    /**
     * PUT /api/articles/:id
     * Обновление статьи
     */
    async updateArticle(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;

            const article = await articleService.updateArticle(id, updateData, userId);

            return res.status(200).json({
                success: true,
                message: 'Статья обновлена',
                data: article
            });

        } catch (error) {
            console.error('Ошибка в updateArticle:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка обновления статьи'
            });
        }
    }

    /**
     * DELETE /api/articles/:id
     * Удаление статьи
     */
    async deleteArticle(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const result = await articleService.deleteArticle(id, userId);

            return res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            console.error('Ошибка в deleteArticle:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка удаления статьи'
            });
        }
    }

    // ==================== WORKFLOW СТАТУСОВ ====================

    /**
     * POST /api/articles/:id/submit
     * Отправка статьи на модерацию (draft → pending)
     */
    async submitForReview(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const article = await articleService.submitForReview(id, userId);

            return res.status(200).json({
                success: true,
                message: 'Статья отправлена на модерацию',
                data: article
            });

        } catch (error) {
            console.error('Ошибка в submitForReview:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка отправки на модерацию'
            });
        }
    }

    /**
     * POST /api/articles/:id/approve
     * Одобрение статьи админом (pending → published)
     */
    async approveArticle(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            const article = await articleService.approveArticle(id, adminId);

            return res.status(200).json({
                success: true,
                message: 'Статья одобрена и опубликована',
                data: article
            });

        } catch (error) {
            console.error('Ошибка в approveArticle:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка одобрения статьи'
            });
        }
    }

    /**
     * POST /api/articles/:id/reject
     * Отклонение статьи админом (pending → rejected)
     */
    async rejectArticle(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const { reason } = req.body;

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Причина отклонения обязательна'
                });
            }

            const article = await articleService.rejectArticle(id, adminId, reason);

            return res.status(200).json({
                success: true,
                message: 'Статья отклонена',
                data: article
            });

        } catch (error) {
            console.error('Ошибка в rejectArticle:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка отклонения статьи'
            });
        }
    }

    // ==================== ПОЛУЧЕНИЕ СПИСКОВ ====================

    /**
     * GET /api/articles/published
     * Получение всех опубликованных статей
     */
    async getPublishedArticles(req, res) {
        try {
            const { limit, skip, sortBy, sortOrder } = req.query;

            const options = {
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0,
                sortBy: sortBy || 'publishedAt',
                sortOrder: parseInt(sortOrder) || -1
            };

            const result = await articleService.getPublishedArticles(options);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Ошибка в getPublishedArticles:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей'
            });
        }
    }

    /**
     * GET /api/articles/category/:categoryId
     * Получение статей в категории
     */
    async getArticlesByCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const { limit, skip, sortBy, sortOrder } = req.query;

            const options = {
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0,
                sortBy: sortBy || 'publishedAt',
                sortOrder: parseInt(sortOrder) || -1
            };

            const result = await articleService.getArticlesByCategory(categoryId, options);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Ошибка в getArticlesByCategory:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей категории'
            });
        }
    }

    /**
     * GET /api/articles/author/:authorId
     * Получение статей автора
     */
    async getArticlesByAuthor(req, res) {
        try {
            const { authorId } = req.params;
            const { limit, skip, status } = req.query;

            const options = {
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0,
                status: status || null
            };

            const result = await articleService.getArticlesByAuthor(authorId, options);

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('Ошибка в getArticlesByAuthor:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей автора'
            });
        }
    }

    /**
     * GET /api/articles/pending
     * Получение статей на модерации (для админа)
     */
    async getPendingArticles(req, res) {
        try {
            const articles = await articleService.getPendingArticles();

            return res.status(200).json({
                success: true,
                data: articles
            });

        } catch (error) {
            console.error('Ошибка в getPendingArticles:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей на модерации'
            });
        }
    }

    /**
     * GET /api/articles/popular
     * Популярные статьи
     */
    async getPopularArticles(req, res) {
        try {
            const { limit, days } = req.query;

            const articles = await articleService.getPopularArticles(
                parseInt(limit) || 10,
                parseInt(days) || 7
            );

            return res.status(200).json({
                success: true,
                data: articles
            });

        } catch (error) {
            console.error('Ошибка в getPopularArticles:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения популярных статей'
            });
        }
    }

    /**
     * GET /api/articles/search
     * Поиск статей
     */
    async searchArticles(req, res) {
        try {
            const { q, limit, skip } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Поисковый запрос обязателен'
                });
            }

            const options = {
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0
            };

            const articles = await articleService.searchArticles(q, options);

            return res.status(200).json({
                success: true,
                data: articles
            });

        } catch (error) {
            console.error('Ошибка в searchArticles:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка поиска статей'
            });
        }
    }

    // ==================== СТАТИСТИКА ====================

    /**
     * POST /api/articles/:id/view
     * Увеличение счетчика просмотров
     */
    async incrementViews(req, res) {
        try {
            const { id } = req.params;

            await articleService.incrementViews(id);

            return res.status(200).json({
                success: true,
                message: 'Просмотр засчитан'
            });

        } catch (error) {
            console.error('Ошибка в incrementViews:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка увеличения просмотров'
            });
        }
    }

    /**
     * GET /api/articles/stats
     * Получение статистики статей
     */
    async getStatistics(req, res) {
        try {
            const stats = await articleService.getStatistics();

            return res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Ошибка в getStatistics:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статистики'
            });
        }
    }
}

export default new ArticleController();