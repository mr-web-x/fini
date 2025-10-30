// ============================================
// validation/commentValidator.js - ОБНОВЛЕННЫЙ
// ============================================

class CommentValidator {

    validateCreateComment(req, res, next) {
        try {
            const { article, content, parentComment } = req.body;

            const errors = [];

            // Article
            if (!article || typeof article !== 'string') {
                errors.push('ID статьи обязателен');
            }

            // Content
            if (!content || typeof content !== 'string') {
                errors.push('Содержимое комментария обязательно');
            } else if (content.trim().length < 3) {
                errors.push('Komentár musí obsahovať minimálne 3 znaky');
            } else if (content.length > 2000) {
                errors.push('Комментарий может содержать максимум 2000 символов');
            }

            // ❌ ЗАПРЕЩАЕМ ParentComment - ответы на комментарии отключены
            if (parentComment !== undefined) {
                errors.push('Ответы на комментарии не поддерживаются');
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Ошибка валидации',
                    errors
                });
            }

            next();

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка валидации'
            });
        }
    }

    validateUpdateComment(req, res, next) {
        try {
            const { content } = req.body;

            if (!content || typeof content !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Содержимое комментария обязательно'
                });
            }

            if (content.trim().length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Komentár musí obsahovať minimálne 3 znaky'
                });
            }

            if (content.length > 2000) {
                return res.status(400).json({
                    success: false,
                    message: 'Комментарий может содержать максимум 2000 символов'
                });
            }

            next();

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Ошибка валидации'
            });
        }
    }
}

export default new CommentValidator();