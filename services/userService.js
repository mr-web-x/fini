// ============================================
// services/userService.js
// ============================================

import UserModel from '../models/User.model.js';
import cryptoService from './cryptoService.js';

class UserService {

    // ==================== УПРАВЛЕНИЕ ПРОФИЛЕМ ====================

    /**
     * Получение информации о пользователе по ID
     * @param {string} userId - ID пользователя
     * @returns {Object} - данные пользователя
     */
    async getUserInfo(userId) {
        try {
            const user = await UserModel.findById(userId).select('-__v');

            if (!user) {
                throw new Error('Пользователь не найден');
            }

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);
        } catch (error) {
            console.error('Ошибка получения информации о пользователе:', error);
            throw error;
        }
    }

    /**
     * Обновление профиля пользователя
     * @param {string} userId - ID пользователя
     * @param {Object} updateData - данные для обновления
     * @returns {Object} - обновленный пользователь
     */
    async updateProfile(userId, updateData) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            const allowedFields = [
                'firstName',
                'lastName',
                'bio',
                'position',
                'showInAuthorsList'
            ];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    user[field] = updateData[field];
                }
            });

            await user.save();
            console.log(`✅ Профиль обновлен: ${user.email}`);

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            throw error;
        }
    }

    // ==================== УТИЛИТЫ ====================

    /**
     * Форматирование ответа пользователя
     * @param {Object} user - объект пользователя из БД
     * @returns {Object} - отформатированные данные
     */
    formatUserResponse(user) {
        return {
            id: user._id,
            email: user.email,
            googleId: user.googleId,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role,
            bio: user.bio,
            position: user.position,
            showInAuthorsList: user.showInAuthorsList,
            isBlocked: user.isBlocked,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}

export default new UserService();