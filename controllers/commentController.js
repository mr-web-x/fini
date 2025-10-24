// ============================================
// controllers/commentController.js
// ============================================

import commentService from '../services/commentService.js';

class CommentController {

    async createComment(req, res) {
        try {
            const userId = req.user.userId;
            const commentData = req.body;

            const comment = await commentService.createComment(commentData, userId);

            return res.status(201).json({
                success: true,
                message: 'Комментарий создан',
                data: comment
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка создания комментария'
            });
        }
    }

    async getCommentById(req, res) {
        try {
            const { id } = req.params;

            const comment = await commentService.getCommentById(id);

            return res.status(200).json({
                success: true,
                message: 'Комментарий получен',
                data: comment
            });

        } catch (error) {
            return res.status(404).json({
                success: false,
                message: error.message || 'Комментарий не найден'
            });
        }
    }

    async updateComment(req, res) {
        try {
            const { id } = req.params;
            const { content } = req.body;
            const userId = req.user.userId;

            const comment = await commentService.updateComment(id, content, userId);

            return res.status(200).json({
                success: true,
                message: 'Комментарий обновлен',
                data: comment
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка обновления комментария'
            });
        }
    }

    async deleteComment(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const result = await commentService.deleteComment(id, userId);

            return res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка удаления комментария'
            });
        }
    }

    async getArticleComments(req, res) {
        try {
            const { articleId } = req.params;
            const { includeDeleted, limit, skip } = req.query;

            const options = {
                includeDeleted: includeDeleted === 'true',
                limit: parseInt(limit) || 50,
                skip: parseInt(skip) || 0
            };

            const result = await commentService.getArticleComments(articleId, options);

            return res.status(200).json({
                success: true,
                message: 'Комментарии получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения комментариев'
            });
        }
    }

    /**
     * НОВЫЙ МЕТОД: Получение комментариев текущего пользователя
     * @route GET /api/comments?author=me
     * @access Private
     */
    async getMyComments(req, res) {
        try {
            // Получаем userId из токена (middleware authenticate)
            const userId = req.user.userId;
            const { includeDeleted, limit, skip } = req.query;

            const options = {
                includeDeleted: includeDeleted === 'true',
                limit: parseInt(limit) || 100,
                skip: parseInt(skip) || 0
            };

            // Используем существующий метод getUserComments из сервиса
            const result = await commentService.getUserComments(userId, options);

            return res.status(200).json({
                success: true,
                message: 'Комментарии пользователя получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения комментариев пользователя'
            });
        }
    }

    async getUserComments(req, res) {
        try {
            const { userId } = req.params;
            const { includeDeleted, limit, skip } = req.query;

            const options = {
                includeDeleted: includeDeleted === 'true',
                limit: parseInt(limit) || 20,
                skip: parseInt(skip) || 0
            };

            const result = await commentService.getUserComments(userId, options);

            return res.status(200).json({
                success: true,
                message: 'Комментарии пользователя получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения комментариев пользователя'
            });
        }
    }

    async getAllComments(req, res) {
        try {
            const { includeDeleted, limit, skip, sortBy, sortOrder } = req.query;

            const options = {
                includeDeleted: includeDeleted === 'true',
                limit: parseInt(limit) || 50,
                skip: parseInt(skip) || 0,
                sortBy: sortBy || 'createdAt',
                sortOrder: parseInt(sortOrder) || -1
            };

            const result = await commentService.getAllComments(options);

            return res.status(200).json({
                success: true,
                message: 'Все комментарии получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения комментариев'
            });
        }
    }

    async moderateDeleteComment(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            // ✅ ИСПРАВЛЕНО: Безопасное получение reason
            const reason = req.body && req.body.reason ? req.body.reason : '';

            const result = await commentService.moderateDeleteComment(id, adminId, reason);

            return res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка модерации комментария'
            });
        }
    }

    async getStatistics(req, res) {
        try {
            const stats = await commentService.getStatistics();

            return res.status(200).json({
                success: true,
                message: 'Статистика комментариев получена',
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

export default new CommentController();