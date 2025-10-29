// ============================================
// controllers/articleController.js
// ============================================

import articleService from '../services/articleService.js';

class ArticleController {
    async createArticle(req, res) {
        try {
            const authorId = req.user.userId;
            const articleData = req.body;

            const article = await articleService.createArticle(articleData, authorId);

            return res.status(201).json({
                success: true,
                message: 'Статья успешно создана',
                data: article
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка при создании статьи'
            });
        }
    }

    async getArticleById(req, res) {
        try {
            const { id } = req.params;

            const article = await articleService.getArticleById(id);

            return res.status(200).json({
                success: true,
                message: 'Статья получена',
                data: article
            });

        } catch (error) {
            return res.status(404).json({
                success: false,
                message: error.message || 'Статья не найдена'
            });
        }
    }

    async getArticleBySlug(req, res) {
        try {
            const { slug } = req.params;

            const article = await articleService.getArticleBySlug(slug);

            return res.status(200).json({
                success: true,
                message: 'Статья получена',
                data: article
            });

        } catch (error) {
            return res.status(404).json({
                success: false,
                message: error.message || 'Статья не найдена'
            });
        }
    }

    async updateArticle(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updateData = req.body;

            // ✅ ДОБАВЬ ЛОГИРОВАНИЕ:
            console.log('🟡 [Backend Controller] updateArticle:', {
                articleId: id,
                userId,
                updateData
            });

            const article = await articleService.updateArticle(id, updateData, userId);

            // ✅ ДОБАВЬ ЛОГИРОВАНИЕ УСПЕХА:
            console.log('🟡 [Backend Controller] Статья обновлена:', article._id);

            return res.status(200).json({
                success: true,
                message: 'Статья обновлена',
                data: article
            });

        } catch (error) {
            // ✅ ДОБАВЬ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ:
            console.error('❌ [Backend Controller] updateArticle error:', {
                message: error.message,
                stack: error.stack
            });
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка обновления статьи'
            });
        }
    }

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
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка удаления статьи'
            });
        }
    }

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
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка отправки на модерацию'
            });
        }
    }

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
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка одобрения статьи'
            });
        }
    }

    async rejectArticle(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const { reason } = req.body;

            const article = await articleService.rejectArticle(id, adminId, reason);

            return res.status(200).json({
                success: true,
                message: 'Статья отклонена',
                data: article
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка отклонения статьи'
            });
        }
    }

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
                message: 'Статьи получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей'
            });
        }
    }

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
                message: 'Статьи категории получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей категории'
            });
        }
    }

    async getMyArticles(req, res) {
        try {
            const userId = req.user.userId;
            const { status } = req.query;

            const result = await articleService.getArticlesByAuthor(userId, { status });

            return res.status(200).json({
                success: true,
                message: 'Мои статьи получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей автора'
            });
        }
    }


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
                message: 'Статьи автора получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей автора'
            });
        }
    }

    async getAllArticlesForAdmin(req, res) {
        try {
            const { limit, skip, sortBy, sortOrder, status, search } = req.query;

            const options = {
                limit: parseInt(limit) || 100,
                skip: parseInt(skip) || 0,
                sortBy: sortBy || 'createdAt',
                sortOrder: parseInt(sortOrder) || -1,
                status: status || null,
                search: search || null
            };

            const result = await articleService.getAllArticlesForAdmin(options);

            return res.status(200).json({
                success: true,
                message: 'Все статьи получены',
                data: result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей'
            });
        }
    }

    async getPendingArticles(req, res) {
        try {
            const articles = await articleService.getPendingArticles();

            return res.status(200).json({
                success: true,
                message: 'Статьи на модерации получены',
                data: articles
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статей на модерации'
            });
        }
    }

    async getPopularArticles(req, res) {
        try {
            const { limit, days } = req.query;

            const articles = await articleService.getPopularArticles(
                parseInt(limit) || 10,
                parseInt(days) || 7
            );

            return res.status(200).json({
                success: true,
                message: 'Популярные статьи получены',
                data: articles
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения популярных статей'
            });
        }
    }

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
                message: 'Результаты поиска получены',
                data: articles
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка поиска статей'
            });
        }
    }

    async incrementViews(req, res) {
        try {
            const { id } = req.params;

            await articleService.incrementViews(id);

            return res.status(200).json({
                success: true,
                message: 'Просмотр засчитан'
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка увеличения просмотров'
            });
        }
    }

    async getStatistics(req, res) {
        try {
            const stats = await articleService.getStatistics();

            return res.status(200).json({
                success: true,
                message: 'Статистика получена',
                data: stats
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статистики'
            });
        }
    }
}

export default new ArticleController();