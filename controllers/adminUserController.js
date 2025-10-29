// ============================================
// controllers/adminUserController.js
// ============================================

import adminUserService from '../services/adminUserService.js';

class AdminUserController {

    // ==================== ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ====================

    /**
     * Получение всех пользователей с фильтрами
     * @route GET /api/admin/users
     * @access Private (admin only)
     */
    async getAllUsers(req, res) {
        try {
            const { page, limit, role, search, isBlocked, sortBy, sortOrder } = req.query;

            const options = {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                role: role || null,
                search: search || null,
                isBlocked: isBlocked || null,
                sortBy: sortBy || 'createdAt',
                sortOrder: parseInt(sortOrder) || -1
            };

            const result = await adminUserService.getAllUsers(options);

            return res.status(200).json({
                success: true,
                message: 'Пользователи получены',
                data: result
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения пользователей'
            });
        }
    }

    /**
     * Получение пользователя по ID
     * @route GET /api/admin/users/:id
     * @access Private (admin only)
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await adminUserService.getUserById(id);

            return res.status(200).json({
                success: true,
                message: 'Пользователь получен',
                data: user
            });

        } catch (error) {
            return res.status(404).json({
                success: false,
                message: error.message || 'Пользователь не найден'
            });
        }
    }

    /**
     * Поиск пользователей
     * @route GET /api/admin/users/search
     * @access Private (admin only)
     */
    async searchUsers(req, res) {
        try {
            const { q, limit, role } = req.query;

            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Поисковый запрос должен содержать минимум 2 символа'
                });
            }

            const options = {
                limit: parseInt(limit) || 10,
                role: role || null
            };

            const users = await adminUserService.searchUsers(q, options);

            return res.status(200).json({
                success: true,
                message: 'Пользователи найдены',
                data: users
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка поиска'
            });
        }
    }

    // ==================== УПРАВЛЕНИЕ БЛОКИРОВКАМИ ====================

    /**
     * Блокировка пользователя
     * @route POST /api/admin/users/:id/block
     * @access Private (admin only)
     */
    async blockUser(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;
            const blockData = req.body;

            const user = await adminUserService.blockUser(id, blockData, adminId);

            return res.status(200).json({
                success: true,
                message: 'Пользователь заблокирован',
                data: user
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка блокировки пользователя'
            });
        }
    }

    /**
     * Разблокировка пользователя
     * @route POST /api/admin/users/:id/unblock
     * @access Private (admin only)
     */
    async unblockUser(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            const user = await adminUserService.unblockUser(id, adminId);

            return res.status(200).json({
                success: true,
                message: 'Пользователь разблокирован',
                data: user
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка разблокировки пользователя'
            });
        }
    }

    // ==================== УПРАВЛЕНИЕ РОЛЯМИ ====================

    /**
     * Изменение роли пользователя
     * @route PUT /api/admin/users/:id/role
     * @access Private (admin only)
     */
    async changeUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const adminId = req.user.userId;

            const user = await adminUserService.changeUserRole(id, role, adminId);

            return res.status(200).json({
                success: true,
                message: 'Роль пользователя изменена',
                data: user
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка изменения роли'
            });
        }
    }

    // ==================== УДАЛЕНИЕ ====================

    /**
     * Удаление пользователя
     * @route DELETE /api/admin/users/:id
     * @access Private (admin only)
     */
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user.userId;

            const result = await adminUserService.deleteUser(id, adminId);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: null
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка удаления пользователя'
            });
        }
    }

    // ==================== СТАТИСТИКА ====================

    /**
     * Получение статистики пользователей
     * @route GET /api/admin/users/stats
     * @access Private (admin only)
     */
    async getUserStatistics(req, res) {
        try {
            const stats = await adminUserService.getUserStatistics();

            return res.status(200).json({
                success: true,
                message: 'Статистика получена',
                data: stats
            });

        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Ошибка получения статистики'
            });
        }
    }
}

export default new AdminUserController();