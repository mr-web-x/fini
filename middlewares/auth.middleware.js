// ============================================
// middlewares/auth.js
// ============================================

import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import config from '../config/index.js';
import cryptoService from '../services/cryptoService.js';

class AuthMiddleware {

    /**
     * Проверка JWT токена для пользователей
     * @param {object} req - Объект запроса
     * @param {object} res - Объект ответа  
     * @param {function} next - Следующий middleware
     */
    authenticate = async (req, res, next) => {
        try {
            // Получаем токен из заголовка Authorization
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    message: "Токен не предоставлен"
                });
            }

            // Проверяем формат токена (Bearer TOKEN)
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Неверный формат токена"
                });
            }

            // Верифицируем JWT токен
            const decoded = jwt.verify(token, config.JWT_SECRET);

            if (!decoded.userId && !decoded._id) {
                return res.status(401).json({
                    success: false,
                    message: "Недействительный токен"
                });
            }

            // Получаем пользователя из базы данных
            const userId = decoded.userId || decoded._id;
            const user = await User.findById(userId).select('-__v');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "Пользователь не найден"
                });
            }

            // Проверяем блокировку пользователя
            if (user.isBlocked.status) {
                // Постоянная блокировка (без until)
                if (!user.isBlocked.until) {
                    return res.status(403).json({
                        success: false,
                        message: `Аккаунт заблокирован навсегда. Причина: ${user.isBlocked.reason}`
                    });
                }

                // Временная блокировка
                if (user.isBlocked.until > new Date()) {
                    const daysLeft = Math.ceil(
                        (user.isBlocked.until - new Date()) / (1000 * 60 * 60 * 24)
                    );

                    return res.status(403).json({
                        success: false,
                        message: `Аккаунт заблокирован до ${user.isBlocked.until.toLocaleDateString()}. Осталось дней: ${daysLeft}. Причина: ${user.isBlocked.reason}`
                    });
                }

                // Блокировка истекла - разблокируем автоматически
                user.isBlocked.status = false;
                user.isBlocked.until = null;
                user.isBlocked.reason = '';
                user.isBlocked.blockedBy = null;
                await user.save();
            }

            // Расшифровываем данные пользователя перед добавлением в req
            await cryptoService.smartDecrypt(user);

            // Добавляем пользователя в req для использования в контроллерах
            req.user = {
                userId: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                googleId: user.googleId
            };

            next();

        } catch (error) {
            console.error('Auth middleware error:', error);

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Токен истек, необходима повторная авторизация"
                });
            }

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: "Недействительный токен"
                });
            }

            return res.status(401).json({
                success: false,
                message: "Ошибка аутентификации"
            });
        }
    };

    /**
     * Проверка роли пользователя
     * @param {string|array} allowedRoles - Разрешенные роли ('user', 'author', 'admin')
     * @returns {function} - Middleware функция
     */
    requireRole = (allowedRoles) => {
        return (req, res, next) => {
            try {
                const { user } = req;

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Пользователь не аутентифицирован"
                    });
                }

                // Приводим к массиву если передана строка
                const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

                if (!roles.includes(user.role)) {
                    return res.status(403).json({
                        success: false,
                        message: `Доступ разрешен только для ролей: ${roles.join(', ')}`
                    });
                }

                next();

            } catch (error) {
                console.error('Role middleware error:', error);
                return res.status(500).json({
                    success: false,
                    message: "Ошибка проверки прав доступа"
                });
            }
        };
    };

    /**
     * Проверка роли с иерархией (admin > author > user)
     * @param {string} requiredRole - Минимально требуемая роль
     * @returns {function} - Middleware функция
     */
    requireMinRole = (requiredRole) => {
        return (req, res, next) => {
            try {
                const { user } = req;

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Пользователь не аутентифицирован"
                    });
                }

                const roleHierarchy = {
                    'user': 1,
                    'author': 2,
                    'admin': 3
                };

                const userRoleLevel = roleHierarchy[user.role] || 0;
                const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

                if (userRoleLevel >= requiredRoleLevel) {
                    next();
                } else {
                    return res.status(403).json({
                        success: false,
                        message: `Недостаточно прав доступа. Требуется роль: ${requiredRole} или выше`
                    });
                }

            } catch (error) {
                console.error('Min role middleware error:', error);
                return res.status(500).json({
                    success: false,
                    message: "Ошибка проверки прав доступа"
                });
            }
        };
    };

    /**
     * Проверка, что пользователь является админом
     * @param {object} req - Объект запроса
     * @param {object} res - Объект ответа
     * @param {function} next - Следующий middleware
     */
    requireAdmin = (req, res, next) => {
        try {
            const { user } = req;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Пользователь не аутентифицирован"
                });
            }

            if (user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "Доступ разрешен только для администраторов"
                });
            }

            next();

        } catch (error) {
            console.error('Admin middleware error:', error);
            return res.status(500).json({
                success: false,
                message: "Ошибка проверки прав администратора"
            });
        }
    };

    /**
     * Проверка, что пользователь является автором или админом
     * @param {object} req - Объект запроса
     * @param {object} res - Объект ответа
     * @param {function} next - Следующий middleware
     */
    requireAuthor = (req, res, next) => {
        try {
            const { user } = req;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Пользователь не аутентифицирован"
                });
            }

            if (user.role !== 'author' && user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "Доступ разрешен только для авторов и администраторов"
                });
            }

            next();

        } catch (error) {
            console.error('Author middleware error:', error);
            return res.status(500).json({
                success: false,
                message: "Ошибка проверки прав автора"
            });
        }
    };

    /**
     * Опциональная аутентификация (не выбрасывает ошибку, если токена нет)
     * @param {object} req - Объект запроса
     * @param {object} res - Объект ответа
     * @param {function} next - Следующий middleware
     */
    optionalAuth = async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                req.user = null;
                return next();
            }

            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            if (!token) {
                req.user = null;
                return next();
            }

            const decoded = jwt.verify(token, config.JWT_SECRET);
            const userId = decoded.userId || decoded._id;
            const user = await User.findById(userId).select('-__v');

            if (user && !user.isBlocked.status) {
                await cryptoService.smartDecrypt(user);

                req.user = {
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName
                };
            } else {
                req.user = null;
            }

            next();

        } catch (error) {
            req.user = null;
            next();
        }
    };

    /**
     * Проверка доступа к собственному профилю
     * @param {object} req - Объект запроса
     * @param {object} res - Объект ответа
     * @param {function} next - Следующий middleware
     */
    checkProfileOwnership = (req, res, next) => {
        try {
            const { user } = req;
            const profileId = req.params.id || req.params.userId;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Пользователь не аутентифицирован"
                });
            }

            // Админ может редактировать любой профиль
            if (user.role === 'admin') {
                return next();
            }

            // Проверяем, что пользователь редактирует свой профиль
            if (user.userId.toString() !== profileId) {
                return res.status(403).json({
                    success: false,
                    message: "Доступ запрещен: можно редактировать только свой профиль"
                });
            }

            next();

        } catch (error) {
            console.error('Profile ownership middleware error:', error);
            return res.status(500).json({
                success: false,
                message: "Ошибка проверки прав доступа к профилю"
            });
        }
    };

    /**
     * Проверка доступа к ресурсу (владелец или админ)
     * @param {string} resourceOwnerField - Поле в req.params с ID владельца ресурса
     * @returns {function} - Middleware функция
     */
    checkResourceOwnership = (resourceOwnerField = 'authorId') => {
        return (req, res, next) => {
            try {
                const { user } = req;
                const ownerId = req.params[resourceOwnerField];

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "Пользователь не аутентифицирован"
                    });
                }

                // Админ может редактировать любой ресурс
                if (user.role === 'admin') {
                    return next();
                }

                // Проверяем, что пользователь владелец ресурса
                if (user.userId.toString() !== ownerId) {
                    return res.status(403).json({
                        success: false,
                        message: "Доступ запрещен: можно редактировать только свои ресурсы"
                    });
                }

                next();

            } catch (error) {
                console.error('Resource ownership middleware error:', error);
                return res.status(500).json({
                    success: false,
                    message: "Ошибка проверки прав доступа к ресурсу"
                });
            }
        };
    };
}

// Экспортируем экземпляр класса
const authMiddleware = new AuthMiddleware();

export default authMiddleware;

// Также экспортируем отдельные методы для удобства
export const {
    authenticate,
    requireRole,
    requireMinRole,
    requireAdmin,
    requireAuthor,
    optionalAuth,
    checkProfileOwnership,
    checkResourceOwnership
} = authMiddleware;