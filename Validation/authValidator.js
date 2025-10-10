// ============================================
// middlewares/validators/authValidator.js
// ============================================

class AuthValidator {

    validateGoogleAuth(req, res, next) {
        try {
            const { token } = req.body;

            if (!token || typeof token !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Google токен обязателен'
                });
            }

            if (token.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Google токен не может быть пустым'
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

    validateRefreshToken(req, res, next) {
        try {
            const { token } = req.body;

            if (!token || typeof token !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'Токен обязателен'
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

    validateUpdateProfile(req, res, next) {
        try {
            const { firstName, lastName, bio, position, showInAuthorsList } = req.body;

            const errors = [];

            // FirstName (опционально)
            if (firstName !== undefined) {
                if (typeof firstName !== 'string') {
                    errors.push('Имя должно быть строкой');
                } else if (firstName.length > 50) {
                    errors.push('Имя может содержать максимум 50 символов');
                }
            }

            // LastName (опционально)
            if (lastName !== undefined) {
                if (typeof lastName !== 'string') {
                    errors.push('Фамилия должна быть строкой');
                } else if (lastName.length > 50) {
                    errors.push('Фамилия может содержать максимум 50 символов');
                }
            }

            // Bio (опционально)
            if (bio !== undefined) {
                if (typeof bio !== 'string') {
                    errors.push('Биография должна быть строкой');
                } else if (bio.length > 500) {
                    errors.push('Биография может содержать максимум 500 символов');
                }
            }

            // Position (опционально)
            if (position !== undefined) {
                if (typeof position !== 'string') {
                    errors.push('Должность должна быть строкой');
                } else if (position.length > 100) {
                    errors.push('Должность может содержать максимум 100 символов');
                }
            }

            // ShowInAuthorsList (опционально)
            if (showInAuthorsList !== undefined && typeof showInAuthorsList !== 'boolean') {
                errors.push('showInAuthorsList должно быть boolean');
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

export default new AuthValidator();