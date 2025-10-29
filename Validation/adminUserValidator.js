// ============================================
// validation/adminUserValidator.js
// ============================================

class AdminUserValidator {

    /**
     * Валидация блокировки пользователя
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     */
    validateBlockUser(req, res, next) {
        try {
            const { reason, until } = req.body;
            const errors = [];

            // Reason обязателен
            if (!reason || typeof reason !== 'string') {
                errors.push('Причина блокировки обязательна');
            } else if (reason.trim().length < 10) {
                errors.push('Причина должна содержать минимум 10 символов');
            } else if (reason.length > 500) {
                errors.push('Причина может содержать максимум 500 символов');
            }

            // Until опционален, но если указан - проверяем
            if (until !== undefined && until !== null) {
                const untilDate = new Date(until);
                if (isNaN(untilDate.getTime())) {
                    errors.push('Некорректная дата окончания блокировки');
                } else if (untilDate <= new Date()) {
                    errors.push('Дата окончания блокировки должна быть в будущем');
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

    /**
     * Валидация изменения роли
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     */
    validateChangeRole(req, res, next) {
        try {
            const { role } = req.body;
            const errors = [];

            // Role обязателен
            if (!role || typeof role !== 'string') {
                errors.push('Роль обязательна');
            } else {
                // ТОЛЬКО user или author - НЕЛЬЗЯ назначить admin
                const validRoles = ['user', 'author'];
                if (!validRoles.includes(role)) {
                    errors.push(`Недопустимая роль. Разрешены только: ${validRoles.join(', ')}`);
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

    /**
     * Валидация поиска пользователей
     * @param {Object} req
     * @param {Object} res
     * @param {Function} next
     */
    validateSearch(req, res, next) {
        try {
            const { q } = req.query;
            const errors = [];

            if (!q || typeof q !== 'string') {
                errors.push('Поисковый запрос обязателен');
            } else if (q.trim().length < 2) {
                errors.push('Поисковый запрос должен содержать минимум 2 символа');
            } else if (q.length > 100) {
                errors.push('Поисковый запрос может содержать максимум 100 символов');
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

export default new AdminUserValidator();