// ============================================
// controllers/authController.js
// ============================================

import authService from '../services/authService.js';

class AuthController {

    /**
     * Авторизация через Google OAuth
     * @route POST /api/auth/google
     * @access Public
     */
    async googleAuth(req, res) {
        try {
            const { token } = req.body;

            const result = await authService.googleAuth(token);

            return res.status(200).json({
                success: true,
                message: 'Авторизация успешна',
                data: result
            });

        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Ошибка авторизации'
            });
        }
    }

    /**
     * Обновление JWT токена
     * @route POST /api/auth/refresh
     * @access Public
     */
    async refreshToken(req, res) {
        try {
            const { token } = req.body;

            const newToken = await authService.refreshToken(token);

            return res.status(200).json({
                success: true,
                message: 'Токен обновлен',
                data: { token: newToken }
            });

        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message || 'Ошибка обновления токена'
            });
        }
    }

    /**
     * Выход из системы
     * @route POST /api/auth/logout
     * @access Private
     */
    async logout(req, res) {
        try {
            return res.status(200).json({
                success: true,
                message: 'Выход выполнен'
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка выхода'
            });
        }
    }
}

export default new AuthController();