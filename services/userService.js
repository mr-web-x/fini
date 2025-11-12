// ============================================
// services/userService.js
// ============================================

import UserModel from '../models/User.model.js';
import cryptoService from './cryptoService.js';
// ✅ НОВОЕ: Импортируем generateSlug
import generateSlug from '../utils/slugGenerator.js';

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
                    throw new Error('Недопустимое значение роли. Допустимые значения: user, author, admin');
                }

                // Запрещаем себя разжаловать
                if (userId === currentUserId && updateData.role !== 'admin') {
                    throw new Error('Вы не можете изменить свою роль администратора');
                }
            }

            // ==================== ПРОВЕРКА ПРАВ НА ИЗМЕНЕНИЕ БЛОКИРОВКИ ====================

            if (updateData.isBlocked !== undefined) {
                // Только админ может блокировать/разблокировать
                if (currentUserRole !== 'admin') {
                    throw new Error('Только администратор может блокировать пользователей');
                }

                // Запрещаем блокировать самого себя
                if (userId === currentUserId) {
                    throw new Error('Вы не можете заблокировать самого себя');
                }
            }

            // ==================== ПРОВЕРКА ПРАВ НА ИЗМЕНЕНИЕ ДРУГИХ ПОЛЕЙ ====================

            // Обычный пользователь может редактировать только свой профиль
            if (currentUserRole !== 'admin' && userId !== currentUserId) {
                throw new Error('У вас нет прав на изменение этого профиля');
            }

            // ==================== ОБНОВЛЕНИЕ ДАННЫХ ====================

            // Обновляем разрешенные поля
            const allowedFields = ['firstName', 'lastName', 'bio', 'position', 'avatar', 'showInAuthorsList'];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    user[field] = updateData[field];
                }
            });

            // Админ может изменять роль и блокировку
            if (currentUserRole === 'admin') {
                if (updateData.role !== undefined) {
                    user.role = updateData.role;
                }

                if (updateData.isBlocked !== undefined) {
                    user.isBlocked = {
                        status: updateData.isBlocked.status || false,
                        until: updateData.isBlocked.until || null,
                        reason: updateData.isBlocked.reason || '',
                        blockedBy: updateData.isBlocked.status ? currentUserId : null
                    };
                }
            }

            // ✅ НОВОЕ: Генерация slug при изменении firstName или lastName
            if (updateData.firstName !== undefined || updateData.lastName !== undefined) {
                // Получаем актуальные значения (новые или старые)
                const firstName = updateData.firstName !== undefined ? updateData.firstName : user.firstName;
                const lastName = updateData.lastName !== undefined ? updateData.lastName : user.lastName;

                // Генерируем slug из firstName-lastName
                if (firstName && lastName) {
                    const baseSlug = generateSlug(`${firstName}-${lastName}`);

                    // Проверяем уникальность slug
                    let uniqueSlug = baseSlug;
                    let counter = 1;

                    // Ищем уникальный slug (исключая текущего пользователя)
                    while (await UserModel.findOne({ slug: uniqueSlug, _id: { $ne: userId } })) {
                        uniqueSlug = `${baseSlug}-${counter}`;
                        counter++;
                    }

                    user.slug = uniqueSlug;
                    console.log(`✅ Сгенерирован slug для пользователя: ${uniqueSlug}`);
                }
            }

            await user.save();

            await cryptoService.smartDecrypt(user);
            return this.formatUserResponse(user);

        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            throw error;
        }
    }

    // ==================== АВТОРЫ ====================

    /**
     * Получение списка авторов
     * @param {Object} options - опции { page, limit, search }
     * @returns {Object} - { authors, total, page, totalPages }
     */
    async getAuthors(options = {}) {
        try {
            const { page = 1, limit = 12, search = null } = options;
            const skip = (page - 1) * limit;

            // Базовый фильтр - только авторы и админы, не заблокированные
            const filter = {
                role: { $in: ['author', 'admin'] },
                showInAuthorsList: true,
                'isBlocked.status': false
            };

            // ✅ ОПТИМИЗАЦИЯ: Если есть поиск, работаем как раньше (т.к. firstName зашифрован)
            if (search) {
                // Загружаем всех авторов для поиска по расшифрованным данным
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
     * ✅ ОПТИМИЗИРОВАНО: Получение автора по slug (прямой поиск в базе)
     * @param {string} slug - slug автора (например: "jan-novak")
     * @returns {Object} - данные автора со статистикой
     */
    async getAuthorBySlug(slug) {
        try {
            // ✅ НОВОЕ: Прямой поиск по slug в базе (быстро!)
            const author = await UserModel.findOne({
                slug: slug,
                role: { $in: ['author', 'admin'] },
                'isBlocked.status': false
            }).select('-__v');

            if (!author) {
                throw new Error('Autor nenájdený');
            }

            // Расшифровываем данные автора
            await cryptoService.smartDecrypt(author);

            // Получаем статистику автора
            const Article = (await import('../models/Article.model.js')).default;

            const articlesCount = await Article.countDocuments({
                author: author._id,
                status: 'published'
            });

            const totalViews = await Article.aggregate([
                {
                    $match: {
                        author: author._id,
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
                memberSince: author.createdAt
            };

            return {
                ...this.formatUserResponse(author),
                stats
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
            updatedAt: user.updatedAt,
            slug: user.slug // ✅ НОВОЕ: Добавляем slug в ответ
        };
    }
}

export default new UserService();