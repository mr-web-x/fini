// ============================================
// controllers/authController.js
// ============================================

import authService from '../services/authService.js';

class AuthController {

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

    async getMe(req, res) {
        try {
            const userId = req.user.userId;

            const user = await authService.getUserInfo(userId);

            return res.status(200).json({
                success: true,
                message: 'Данные пользователя получены',
                data: user
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения данных пользователя'
            });
        }
    }

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
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка обновления профиля'
            });
        }
    }

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
