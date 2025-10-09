import authService from '../services/authService.js';

class AuthController {

    /**
     * POST /api/auth/google
     * Вход или регистрация через Google OAuth
     */
    async googleAuth(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Google токен обязателен'
                });
            }

            const result = await authService.googleAuth(token);

            return res.status(200).json({
                success: true,
                message: 'Авторизация успешна',
                data: result
            });

        } catch (error) {
            console.error('Ошибка в googleAuth:', error);

            return res.status(401).json({
                success: false,
                message: error.message || 'Ошибка авторизации'
            });
        }
    }

    /**
     * GET /api/auth/me
     * Получение информации о текущем пользователе
     */
    async getMe(req, res) {
        try {
            // req.user устанавливается в auth middleware
            const userId = req.user.userId;

            const user = await authService.getUserInfo(userId);

            return res.status(200).json({
                success: true,
                data: user
            });

        } catch (error) {
            console.error('Ошибка в getMe:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения данных пользователя'
            });
        }
    }

    /**
     * POST /api/auth/refresh
     * Обновление JWT токена
     */
    async refreshToken(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Токен обязателен'
                });
            }

            const newToken = await authService.refreshToken(token);

            return res.status(200).json({
                success: true,
                message: 'Токен обновлен',
                data: {
                    token: newToken
                }
            });

        } catch (error) {
            console.error('Ошибка в refreshToken:', error);

            return res.status(401).json({
                success: false,
                message: error.message || 'Ошибка обновления токена'
            });
        }
    }

    /**
     * PUT /api/auth/profile
     * Обновление профиля текущего пользователя
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const updateData = req.body;

            const updatedUser = await authService.updateProfile(userId, updateData);

            return res.status(200).json({
                success: true,
                message: 'Профиль обновлен',
                data: updatedUser
            });

        } catch (error) {
            console.error('Ошибка в updateProfile:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка обновления профиля'
            });
        }
    }

    /**
     * POST /api/auth/logout
     * Выход из системы (на клиенте удаляется токен)
     */
    async logout(req, res) {
        try {
            // Logout на стороне клиента (удаление токена)
            // На сервере ничего не делаем, т.к. JWT stateless

            return res.status(200).json({
                success: true,
                message: 'Выход выполнен'
            });

        } catch (error) {
            console.error('Ошибка в logout:', error);

            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка выхода'
            });
        }
    }
}

export default new AuthController();