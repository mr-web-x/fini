// ============================================
// middlewares/validators/commonValidator.js
// ============================================

class CommonValidator {

    validateMongoId(req, res, next) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'ID обязателен'
                });
            }

            // Проверка формата MongoDB ObjectId
            if (!/^[0-9a-fA-F]{24}$/.test(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный формат ID'
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

    validateSlug(req, res, next) {
        try {
            const { slug } = req.params;

            if (!slug || typeof slug !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Slug обязателен'
                });
            }

            if (!/^[a-z0-9-]+$/.test(slug)) {
                return res.status(400).json({
                    success: false,
                    message: 'Неверный формат slug'
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

    validatePagination(req, res, next) {
        try {
            const { limit, skip, page } = req.query;

            // Limit
            if (limit !== undefined) {
                const limitNum = parseInt(limit);
                if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                    return res.status(400).json({
                        success: false,
                        message: 'Limit должен быть числом от 1 до 100'
                    });
                }
            }

            // Skip
            if (skip !== undefined) {
                const skipNum = parseInt(skip);
                if (isNaN(skipNum) || skipNum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Skip должен быть числом >= 0'
                    });
                }
            }

            // Page
            if (page !== undefined) {
                const pageNum = parseInt(page);
                if (isNaN(pageNum) || pageNum < 1) {
                    return res.status(400).json({
                        success: false,
                        message: 'Page должен быть числом >= 1'
                    });
                }
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

export default new CommonValidator();