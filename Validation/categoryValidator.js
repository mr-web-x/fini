// ============================================
// validation/categoryValidator.js
// ============================================

class CategoryValidator {

    validateCreateCategory(req, res, next) {
        try {
            const { name, slug, description, seo, order } = req.body;

            const errors = [];

            // Name
            if (!name || typeof name !== 'string') {
                errors.push('Название категории обязательно');
            } else if (name.trim().length < 2) {
                errors.push('Название должно содержать минимум 2 символа');
            } else if (name.length > 50) {
                errors.push('Название может содержать максимум 50 символов');
            }

            // Slug
            if (!slug || typeof slug !== 'string') {
                errors.push('Slug обязателен');
            } else if (!/^[a-z0-9-]+$/.test(slug)) {
                errors.push('Slug может содержать только латинские буквы, цифры и дефисы');
            }

            // ✅ ИСПРАВЛЕНО: Description теперь опционален
            // Если передан description, проверяем его
            if (description !== undefined && description !== null && description !== '') {
                if (typeof description !== 'string') {
                    errors.push('Описание должно быть строкой');
                } else if (description.trim().length < 10) {
                    errors.push('Если указываете описание, оно должно содержать минимум 10 символов');
                } else if (description.length > 500) {
                    errors.push('Описание может содержать максимум 500 символов');
                }
            }

            // Order (опционально)
            if (order !== undefined && typeof order !== 'number') {
                errors.push('Порядок должен быть числом');
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

    validateUpdateCategory(req, res, next) {
        try {
            const { name, slug, description, seo, order } = req.body;

            const errors = [];

            // Name (опционально)
            if (name !== undefined) {
                if (typeof name !== 'string') {
                    errors.push('Название должно быть строкой');
                } else if (name.trim().length < 2) {
                    errors.push('Название должно содержать минимум 2 символа');
                } else if (name.length > 50) {
                    errors.push('Название может содержать максимум 50 символов');
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

            // Description (опционально)
            if (description !== undefined) {
                if (typeof description !== 'string') {
                    errors.push('Описание должно быть строкой');
                } else if (description.trim().length > 0 && description.trim().length < 10) {
                    errors.push('Если указываете описание, оно должно содержать минимум 10 символов');
                } else if (description.length > 500) {
                    errors.push('Описание может содержать максимум 500 символов');
                }
            }

            // Order (опционально)
            if (order !== undefined && typeof order !== 'number') {
                errors.push('Порядок должен быть числом');
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
}

export default new CategoryValidator()