// ============================================
// controllers/userController.js
// ============================================

import userService from '../services/userService.js';

class UserController {

    /**
     * Получение информации о текущем пользователе
     * @route GET /api/users/me
     * @access Private
     */
    async getMe(req, res) {
        try {
            const userId = req.user.userId;

            const user = await userService.getUserInfo(userId);

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

    /**
     * Обновление профиля пользователя
     * @route PUT /api/users/profile/:id
     * @access Private (только владелец профиля или админ)
     */
    async updateProfile(req, res) {
        try {
            const userId = req.params.id;
            const updateData = req.body;

            // Передаем данные текущего пользователя для проверки прав
            const currentUserId = req.user.userId.toString();
            const currentUserRole = req.user.role;

            const updatedUser = await userService.updateProfile(
                userId,
                updateData,
                currentUserId,
                currentUserRole
            );

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
}

export default new UserController();