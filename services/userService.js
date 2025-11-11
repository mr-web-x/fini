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
     * @param {string} currentUserId - ID текущего пользователя (кто делает запрос)
     * @param {string} currentUserRole - роль текущего пользователя
     * @returns {Object} - обновленный пользователь
     */
    async updateProfile(userId, updateData, currentUserId, currentUserRole) {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }

            // ==================== ПРОВЕРКА ПРАВ НА ИЗМЕНЕНИЕ РОЛИ ====================

            // Если пытаются изменить роль
            if (updateData.role !== undefined) {
                // Только админ может менять роли
                if (currentUserRole !== 'admin') {
                    throw new Error('Только администратор может изменять роли пользователей');
                }

                // Валидация значения роли
                const validRoles = ['user', 'author', 'admin'];
                if (!validRoles.includes(updateData.role)) {
                    throw new Error('Недопустимое значение роли. Разрешены: user, author, admin');
                }

                // Админ не может изменить свою собственную роль (защита от случайного понижения)
                if (userId === currentUserId && user.role === 'admin') {
                    throw new Error('Нельзя изменить собственную роль администратора');
                }

                // Обновляем роль
                user.role = updateData.role;
                console.log(`🔐 Роль пользователя ${user.email} изменена: ${user.role} → ${updateData.role} (Admin: ${currentUserId})`);
            }

            // ==================== ОБНОВЛЕНИЕ БАЗОВЫХ ПОЛЕЙ ====================

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


    /**
 * Получение всех авторов (публичный доступ)
 * @param {Object} options - параметры запроса
 * @returns {Object} - список авторов с пагинацией и количеством статей
 */
async getAuthors(options = {}) {
    try {
        const {
            page = 1,
            limit = 12,
            search = null
        } = options;

        const skip = (page - 1) * limit;

        // Фильтр: только авторы, не заблокированные
        const filter = {
            role: { $in: ['author', 'admin'] },
            'isBlocked.status': false
        };

        // Поиск по имени/фамилии
        if (search) {
            // Придется расшифровать всех авторов для поиска
            const allAuthors = await UserModel.find(filter).select('-__v');
            
            const decryptedAuthors = [];
            for (const author of allAuthors) {
                await cryptoService.smartDecrypt(author);
                const searchLower = search.toLowerCase();
                if (
                    author.firstName?.toLowerCase().includes(searchLower) ||
                    author.lastName?.toLowerCase().includes(searchLower)
                ) {
                    decryptedAuthors.push(author);
                }
            }

            // Применяем пагинацию после поиска
            const paginatedAuthors = decryptedAuthors.slice(skip, skip + limit);

            // Получаем количество статей для каждого автора
            const Article = (await import('../models/Article.model.js')).default;
            const authorsWithStats = await Promise.all(
                paginatedAuthors.map(async (author) => {
                    const articlesCount = await Article.countDocuments({
                        author: author._id,
                        status: 'published'
                    });

                    return {
                        ...this.formatUserResponse(author),
                        articlesCount
                    };
                })
            );

            return {
                authors: authorsWithStats,
                total: decryptedAuthors.length,
                page,
                totalPages: Math.ceil(decryptedAuthors.length / limit)
            };
        }

        // Обычный запрос без поиска
        const authors = await UserModel.find(filter)
            .select('-__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await UserModel.countDocuments(filter);

        // Расшифровываем данные
        for (const author of authors) {
            await cryptoService.smartDecrypt(author);
        }

        // Получаем количество статей для каждого автора
        const Article = (await import('../models/Article.model.js')).default;
        const authorsWithStats = await Promise.all(
            authors.map(async (author) => {
                const articlesCount = await Article.countDocuments({
                    author: author._id,
                    status: 'published'
                });

                return {
                    ...this.formatUserResponse(author),
                    articlesCount
                };
            })
        );

        return {
            authors: authorsWithStats,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };

    } catch (error) {
        console.error('Ошибка получения авторов:', error);
        throw error;
    }
}

/**
 * Получение автора по slug (firstName-lastName)
 * @param {string} slug - slug автора (например: "jan-novak")
 * @returns {Object} - данные автора со статистикой
 */
async getAuthorBySlug(slug) {
    try {
        // Разбираем slug на firstName и lastName
        // Например: "jan-novak" -> firstName: "jan", lastName: "novak"
        const slugParts = slug.split('-');
        
        if (slugParts.length < 2) {
            throw new Error('Neplatný formát mena autora');
        }

        // Получаем всех авторов и ищем по расшифрованным данным
        const authors = await UserModel.find({
            role: { $in: ['author', 'admin'] },
            'isBlocked.status': false
        }).select('-__v');

        // Расшифровываем и ищем подходящего автора
        let foundAuthor = null;
        for (const author of authors) {
            await cryptoService.smartDecrypt(author);
            
            // Генерируем slug из имени автора
            const authorSlug = `${author.firstName}-${author.lastName}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // убираем диакритику
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            if (authorSlug === slug) {
                foundAuthor = author;
                break;
            }
        }

        if (!foundAuthor) {
            throw new Error('Autor nenájdený');
        }

        // Получаем статистику автора
        const Article = (await import('../models/Article.model.js')).default;
        
        const articlesCount = await Article.countDocuments({
            author: foundAuthor._id,
            status: 'published'
        });

        const totalViews = await Article.aggregate([
            {
                $match: {
                    author: foundAuthor._id,
                    status: 'published'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$views' }
                }
            }
        ]);

        const stats = {
            articlesCount,
            totalViews: totalViews[0]?.total || 0,
            memberSince: foundAuthor.createdAt
        };

        return {
            ...this.formatUserResponse(foundAuthor),
            stats,
            slug: slug // возвращаем slug обратно
        };

    } catch (error) {
        console.error('Ошибка получения автора по slug:', error);
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