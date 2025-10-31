// ============================================
// services/adminUserService.js
// ============================================

import UserModel from '../models/User.model.js';
import cryptoService from './cryptoService.js';

class AdminUserService {

    // ==================== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ====================

    /**
     * Получение всех пользователей с фильтрами и пагинацией
     * @param {Object} options - опции фильтрации и пагинации
     * @returns {Object} - список пользователей с метаданными
     */
    async getAllUsers(options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                role = null,
                search = null,
                isBlocked = null,
                sortBy = 'createdAt',
                sortOrder = -1
            } = options;

            const skip = (page - 1) * limit;

            // Построение фильтра
            const filter = {};

            // Фильтр по роли
            if (role && ['user', 'author', 'admin'].includes(role)) {
                filter.role = role;
            }

            // Фильтр по статусу блокировки
            if (isBlocked !== null) {
                filter['isBlocked.status'] = isBlocked === 'true' || isBlocked === true;
            }

            // ✅ ИСПРАВЛЕНО: Полнотекстовый поиск для зашифрованных данных
            if (search && search.trim()) {
                // Получаем ВСЕХ пользователей и фильтруем на уровне JavaScript
                // Это не оптимально для больших баз, но работает с зашифрованными данными
                const allUsers = await UserModel.find(filter)
                    .select('-__v')
                    .sort({ [sortBy]: sortOrder });

                // Расшифровываем и фильтруем
                const decryptedUsers = [];
                for (const user of allUsers) {
                    await cryptoService.smartDecrypt(user);
                    const userData = this.formatUserResponse(user);

                    // Поиск по расшифрованным данным
                    const searchLower = search.toLowerCase();
                    if (
                        userData.firstName?.toLowerCase().includes(searchLower) ||
                        userData.lastName?.toLowerCase().includes(searchLower) ||
                        userData.email?.toLowerCase().includes(searchLower) ||
                        userData.displayName?.toLowerCase().includes(searchLower)
                    ) {
                        decryptedUsers.push(userData);
                    }
                }

                // Применяем пагинацию
                const startIndex = skip;
                const endIndex = skip + parseInt(limit);
                const paginatedUsers = decryptedUsers.slice(startIndex, endIndex);

                return {
                    users: paginatedUsers,
                    pagination: {
                        total: decryptedUsers.length,
                        page: parseInt(page),
                        pages: Math.ceil(decryptedUsers.length / limit),
                        limit: parseInt(limit)
                    }
                };
            }

            // Обычный запрос без поиска
            const users = await UserModel.find(filter)
                .select('-__v')
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(parseInt(limit));

            // Получаем общее количество
            const total = await UserModel.countDocuments(filter);

            // Расшифровываем данные
            for (const user of users) {
                await cryptoService.smartDecrypt(user);
            }

            return {
                users: users.map(user => this.formatUserResponse(user)),
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                }
            };

        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            throw error;
        }
    }

    /**
     * Получение пользователя по ID
     * @param {string} userId - ID пользователя
     * @returns {Object} - данные пользователя
     */
    async getUserById(userId) {
        try {
            const user = await UserModel.findById(userId).select('-__v');

            if (!user) {
                throw new Error('Пользователь не найден');
            }

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);

        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
            throw error;
        }
    }

    /**
     * Поиск пользователей (альтернативный метод)
     * @param {string} query - поисковый запрос
     * @param {Object} options - дополнительные опции
     * @returns {Array} - найденные пользователи
     */
    async searchUsers(query, options = {}) {
        try {
            const { limit = 10, role = null } = options;

            // Базовый фильтр
            const filter = {};
            if (role && ['user', 'author', 'admin'].includes(role)) {
                filter.role = role;
            }

            // Получаем всех пользователей и фильтруем на JS
            const users = await UserModel.find(filter)
                .select('-__v')
                .limit(parseInt(limit));

            // Расшифровываем и фильтруем
            const decryptedUsers = [];
            for (const user of users) {
                await cryptoService.smartDecrypt(user);
                const userData = this.formatUserResponse(user);

                const searchLower = query.toLowerCase();
                if (
                    userData.firstName?.toLowerCase().includes(searchLower) ||
                    userData.lastName?.toLowerCase().includes(searchLower) ||
                    userData.email?.toLowerCase().includes(searchLower) ||
                    userData.displayName?.toLowerCase().includes(searchLower)
                ) {
                    decryptedUsers.push(userData);
                }
            }

            return decryptedUsers;

        } catch (error) {
            console.error('Ошибка поиска пользователей:', error);
            throw error;
        }
    }

    // ==================== УПРАВЛЕНИЕ БЛОКИРОВКАМИ ====================

    /**
     * Блокировка пользователя
     * @param {string} userId - ID пользователя для блокировки
     * @param {Object} blockData - данные блокировки
     * @param {string} adminId - ID администратора
     * @returns {Object} - обновленный пользователь
     */
    async blockUser(userId, blockData, adminId) {
        try {
            const { reason, until = null } = blockData;

            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // Нельзя заблокировать самого себя
            if (userId === adminId) {
                throw new Error('Нельзя заблокировать самого себя');
            }

            // Нельзя заблокировать другого админа (защита)
            if (user.role === 'admin') {
                throw new Error('Нельзя заблокировать администратора');
            }

            // Проверяем что пользователь не заблокирован уже
            if (user.isBlocked.status) {
                throw new Error('Пользователь уже заблокирован');
            }

            // Устанавливаем блокировку
            user.isBlocked = {
                status: true,
                until: until ? new Date(until) : null,
                reason: reason || 'Нарушение правил',
                blockedBy: adminId
            };

            await user.save();
            console.log(`🔒 Пользователь ${user.email} заблокирован (Admin: ${adminId})`);

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);

        } catch (error) {
            console.error('Ошибка блокировки пользователя:', error);
            throw error;
        }
    }

    /**
     * Разблокировка пользователя
     * @param {string} userId - ID пользователя
     * @param {string} adminId - ID администратора
     * @returns {Object} - обновленный пользователь
     */
    async unblockUser(userId, adminId) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // Проверяем что пользователь заблокирован
            if (!user.isBlocked.status) {
                throw new Error('Пользователь не заблокирован');
            }

            // Снимаем блокировку
            user.isBlocked = {
                status: false,
                until: null,
                reason: '',
                blockedBy: null
            };

            await user.save();
            console.log(`🔓 Пользователь ${user.email} разблокирован (Admin: ${adminId})`);

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);

        } catch (error) {
            console.error('Ошибка разблокировки пользователя:', error);
            throw error;
        }
    }

    // ==================== УПРАВЛЕНИЕ РОЛЯМИ ====================

    /**
     * Изменение роли пользователя
     * @param {string} userId - ID пользователя
     * @param {string} newRole - новая роль (user или author)
     * @param {string} adminId - ID администратора
     * @returns {Object} - обновленный пользователь
     */
    async changeUserRole(userId, newRole, adminId) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // Валидация новой роли - ТОЛЬКО user или author
            const validRoles = ['user', 'author'];
            if (!validRoles.includes(newRole)) {
                throw new Error(`Недопустимая роль. Разрешены: ${validRoles.join(', ')}`);
            }

            // Нельзя изменить роль самому себе
            if (userId === adminId) {
                throw new Error('Нельзя изменить свою собственную роль');
            }

            // Нельзя изменить роль администратора
            if (user.role === 'admin') {
                throw new Error('Нельзя изменить роль администратора');
            }

            // Проверяем что роль действительно меняется
            if (user.role === newRole) {
                throw new Error(`Пользователь уже имеет роль ${newRole}`);
            }

            const oldRole = user.role;
            user.role = newRole;
            await user.save();

            console.log(`🔄 Роль пользователя ${user.email} изменена: ${oldRole} → ${newRole} (Admin: ${adminId})`);

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);

        } catch (error) {
            console.error('Ошибка изменения роли:', error);
            throw error;
        }
    }

    // ==================== УДАЛЕНИЕ ====================

    /**
     * Удаление пользователя (мягкое удаление - блокировка)
     * @param {string} userId - ID пользователя
     * @param {string} adminId - ID администратора
     * @returns {Object} - результат операции
     */
    async deleteUser(userId, adminId) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // Нельзя удалить самого себя
            if (userId === adminId) {
                throw new Error('Нельзя удалить самого себя');
            }

            // Нельзя удалить другого админа
            if (user.role === 'admin') {
                throw new Error('Нельзя удалить администратора');
            }

            // Вместо физического удаления - блокируем навсегда
            user.isBlocked = {
                status: true,
                until: null, // Навсегда
                reason: 'Аккаунт удален администратором',
                blockedBy: adminId
            };

            await user.save();
            console.log(`🗑️ Пользователь ${user.email} удален (заблокирован навсегда) (Admin: ${adminId})`);

            return {
                success: true,
                message: 'Пользователь успешно удален'
            };

        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            throw error;
        }
    }

    // ==================== СТАТИСТИКА ====================

    /**
     * Получение статистики пользователей
     * @returns {Object} - статистика
     */
    async getUserStatistics() {
        try {
            const totalUsers = await UserModel.countDocuments();
            const totalBlocked = await UserModel.countDocuments({ 'isBlocked.status': true });

            // Статистика по ролям
            const roleStats = await UserModel.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Преобразуем в удобный формат
            const roles = {
                user: 0,
                author: 0,
                admin: 0
            };

            roleStats.forEach(stat => {
                roles[stat._id] = stat.count;
            });

            // Последние зарегистрированные
            const recentUsers = await UserModel.find()
                .select('email firstName lastName role createdAt')
                .sort({ createdAt: -1 })
                .limit(5);

            // Расшифровываем данные
            for (const user of recentUsers) {
                await cryptoService.smartDecrypt(user);
            }

            return {
                total: totalUsers,
                blocked: totalBlocked,
                active: totalUsers - totalBlocked,
                roles,
                recentUsers: recentUsers.map(user => ({
                    id: user._id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role,
                    createdAt: user.createdAt
                }))
            };

        } catch (error) {
            console.error('Ошибка получения статистики:', error);
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
            displayName: `${user.firstName} ${user.lastName}`,
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

export default new AdminUserService();