// ============================================
// validation/articleValidate.js - ИСПРАВЛЕННЫЙ
// ============================================

class ArticleValidator {

    validateCreateArticle(req, res, next) {
        try {
            const { title, slug, excerpt, content, category, tags, seo } = req.body;

            const errors = [];

            // Title
            if (!title || typeof title !== 'string') {
                errors.push('Заголовок обязателен');
            } else if (title.trim().length < 10) {
                errors.push('Заголовок должен содержать минимум 10 символов');
            } else if (title.length > 200) {
                errors.push('Заголовок может содержать максимум 200 символов');
            }

            // ✅ ИСПРАВЛЕНО: Slug теперь ОПЦИОНАЛЕН (генерируется автоматически на backend)
            if (slug !== undefined && slug !== null && slug !== '') {
                if (typeof slug !== 'string') {
                    errors.push('Slug должен быть строкой');
                } else if (!/^[a-z0-9-]+$/.test(slug)) {
                    errors.push('Slug может содержать только латинские буквы, цифры и дефисы');
                }
            }

            // ✅ ИСПРАВЛЕНО: Excerpt максимум 320 символов (было 200)
            if (!excerpt || typeof excerpt !== 'string') {
                errors.push('Краткое описание обязательно');
            } else if (excerpt.trim().length < 150) {
                errors.push('Описание должно содержать минимум 150 символов');
            } else if (excerpt.length > 320) {
                errors.push('Описание может содержать максимум 320 символов');
            }

            // Content
            if (!content || typeof content !== 'string') {
                errors.push('Содержимое статьи обязательно');
            } else if (content.trim().length < 100) {
                errors.push('Содержимое должно содержать минимум 100 символов');
            }

            // Category
            if (!category || typeof category !== 'string') {
                errors.push('Категория обязательна');
            }

            // Tags (опционально)
            if (tags && !Array.isArray(tags)) {
                errors.push('Теги должны быть массивом');
            }

            // SEO (опционально)
            if (seo) {
                if (seo.metaTitle && seo.metaTitle.length > 60) {
                    errors.push('Meta title может содержать максимум 60 символов');
                }
                if (seo.metaDescription && seo.metaDescription.length > 160) {
                    errors.push('Meta description может содержать максимум 160 символов');
                }
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

    validateUpdateArticle(req, res, next) {
        try {
            const { title, slug, excerpt, content, category, tags, seo } = req.body;

            const errors = [];

            // Title (опционально при обновлении)
            if (title !== undefined) {
                if (typeof title !== 'string') {
                    errors.push('Заголовок должен быть строкой');
                } else if (title.trim().length < 10) {
                    errors.push('Заголовок должен содержать минимум 10 символов');
                } else if (title.length > 200) {
                    errors.push('Заголовок может содержать максимум 200 символов');
                }
            }

            // Slug (опционально)
            if (slug !== undefined) {
                if (typeof slug !== 'string') {
                    errors.push('Slug должен быть строкой');
                } else if (!/^[a-z0-9-]+$/.test(slug)) {
                    errors.push('Slug может содержать только латинские буквы, цифры и дефисы');
                }
            }

            // ✅ ИСПРАВЛЕНО: Excerpt максимум 320 символов (было 200)
            if (excerpt !== undefined) {
                if (typeof excerpt !== 'string') {
                    errors.push('Описание должно быть строкой');
                } else if (excerpt.trim().length < 150) {
                    errors.push('Описание должно содержать минимум 150 символов');
                } else if (excerpt.length > 320) {
                    errors.push('Описание может содержать максимум 320 символов');
                }
            }

            // Content (опционально)
            if (content !== undefined) {
                if (typeof content !== 'string') {
                    errors.push('Содержимое должно быть строкой');
                } else if (content.trim().length < 100) {
                    errors.push('Содержимое должно содержать минимум 100 символов');
                }
            }

            // Category (опционально)
            if (category !== undefined && typeof category !== 'string') {
                errors.push('Категория должна быть строкой');
            }

            // Tags (опционально)
            if (tags !== undefined && !Array.isArray(tags)) {
                errors.push('Теги должны быть массивом');
            }

            // SEO (опционально)
            if (seo) {
                if (seo.metaTitle && seo.metaTitle.length > 60) {
                    errors.push('Meta title может содержать максимум 60 символов');
                }
                if (seo.metaDescription && seo.metaDescription.length > 160) {
                    errors.push('Meta description может содержать максимум 160 символов');
                }
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

    validateRejectArticle(req, res, next) {
        try {
            const { reason } = req.body;

            if (!reason || typeof reason !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Причина отклонения обязательна'
                });
            }

            if (reason.trim().length < 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Причина должна содержать минимум 10 символов'
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

export default new ArticleValidator();