// ============================================
// tests/unit/services/userService.test.js
// ============================================

import { jest } from '@jest/globals';

// ==================== СОЗДАЕМ МОКИ ВРУЧНУЮ ====================

// Мок для UserModel
const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
};

// Мок для cryptoService
const mockCryptoService = {
    smartDecrypt: jest.fn((obj) => Promise.resolve(obj))
};

// Мокаем модули ПЕРЕД импортом userService
jest.unstable_mockModule('../../../models/User.model.js', () => ({
    default: mockUserModel
}));

jest.unstable_mockModule('../../../services/cryptoService.js', () => ({
    default: mockCryptoService
}));

// Импортируем userService ПОСЛЕ настройки моков
const { default: userService } = await import('../../../services/userService.js');

// ==================== ТЕСТОВЫЕ ДАННЫЕ ====================

const mockUserId = '507f1f77bcf86cd799439011';
const mockAdminId = '507f1f77bcf86cd799439012';
const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    googleId: 'google123',
    firstName: 'Иван',
    lastName: 'Иванов',
    avatar: 'https://example.com/avatar.jpg',
    role: 'user',
    bio: 'Тестовая биография',
    position: 'Разработчик',
    showInAuthorsList: true,
    isBlocked: {
        status: false,
        until: null,
        reason: '',
        blockedBy: null
    },
    lastLogin: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    save: jest.fn()
};

const mockAdmin = {
    _id: mockAdminId,
    email: 'admin@example.com',
    googleId: 'google456',
    firstName: 'Админ',
    lastName: 'Админов',
    avatar: 'https://example.com/admin.jpg',
    role: 'admin',
    bio: 'Администратор системы',
    position: 'Администратор',
    showInAuthorsList: false,
    isBlocked: {
        status: false,
        until: null,
        reason: '',
        blockedBy: null
    },
    lastLogin: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    save: jest.fn()
};

// ==================== НАСТРОЙКА ТЕСТОВ ====================

describe('UserService', () => {

    // Очищаем все моки перед каждым тестом
    beforeEach(() => {
        jest.clearAllMocks();

        // Сбрасываем дефолтную реализацию smartDecrypt
        mockCryptoService.smartDecrypt.mockImplementation((obj) => Promise.resolve(obj));
    });

    // ==================== getUserInfo ====================

    describe('getUserInfo', () => {

        it('должен вернуть информацию о пользователе при успешном запросе', async () => {
            // Arrange
            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findById.mockReturnValue({ select: mockSelect });

            // Act
            const result = await userService.getUserInfo(mockUserId);

            // Assert
            expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
            expect(mockSelect).toHaveBeenCalledWith('-__v');
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledWith(mockUser);
            expect(result).toEqual({
                id: mockUser._id,
                email: mockUser.email,
                googleId: mockUser.googleId,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                avatar: mockUser.avatar,
                role: mockUser.role,
                bio: mockUser.bio,
                position: mockUser.position,
                showInAuthorsList: mockUser.showInAuthorsList,
                isBlocked: mockUser.isBlocked,
                lastLogin: mockUser.lastLogin,
                createdAt: mockUser.createdAt,
                updatedAt: mockUser.updatedAt
            });
        });

        it('должен выбросить ошибку, если пользователь не найден', async () => {
            // Arrange
            const mockSelect = jest.fn().mockResolvedValue(null);
            mockUserModel.findById.mockReturnValue({ select: mockSelect });

            // Act & Assert
            await expect(userService.getUserInfo(mockUserId))
                .rejects
                .toThrow('Пользователь не найден');

            expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
            expect(mockCryptoService.smartDecrypt).not.toHaveBeenCalled();
        });

        it('должен вызвать расшифровку данных через cryptoService', async () => {
            // Arrange
            const mockSelect = jest.fn().mockResolvedValue(mockUser);
            mockUserModel.findById.mockReturnValue({ select: mockSelect });

            // Act
            await userService.getUserInfo(mockUserId);

            // Assert
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledTimes(1);
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledWith(mockUser);
        });

        it('должен обработать ошибку при получении пользователя', async () => {
            // Arrange
            const errorMessage = 'Database connection error';
            mockUserModel.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error(errorMessage))
            });

            // Act & Assert
            await expect(userService.getUserInfo(mockUserId))
                .rejects
                .toThrow(errorMessage);
        });
    });

    // ==================== updateProfile ====================

    describe('updateProfile', () => {

        // ==================== УСПЕШНЫЕ ОБНОВЛЕНИЯ ====================

        it('должен обновить базовые поля профиля пользователя', async () => {
            // Arrange
            const updateData = {
                firstName: 'Петр',
                lastName: 'Петров',
                bio: 'Новая биография',
                position: 'Senior Developer',
                showInAuthorsList: false
            };

            const updatedUser = {
                ...mockUser,
                ...updateData,
                save: jest.fn().mockResolvedValue(true)
            };

            mockUserModel.findById.mockResolvedValue(updatedUser);

            // Act
            const result = await userService.updateProfile(
                mockUserId,
                updateData,
                mockUserId,
                'user'
            );

            // Assert
            expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
            expect(updatedUser.save).toHaveBeenCalled();
            expect(result.firstName).toBe('Петр');
            expect(result.lastName).toBe('Петров');
            expect(result.bio).toBe('Новая биография');
            expect(result.position).toBe('Senior Developer');
            expect(result.showInAuthorsList).toBe(false);
        });

        it('должен игнорировать недопустимые поля при обновлении', async () => {
            // Arrange
            const updateData = {
                firstName: 'Петр',
                email: 'hacker@evil.com',  // ❌ Не должно обновиться
                googleId: 'hacked123',      // ❌ Не должно обновиться
                _id: 'newid123'             // ❌ Не должно обновиться
            };

            const updatedUser = {
                ...mockUser,
                firstName: 'Петр',
                save: jest.fn().mockResolvedValue(true)
            };

            mockUserModel.findById.mockResolvedValue(updatedUser);

            // Act
            await userService.updateProfile(
                mockUserId,
                updateData,
                mockUserId,
                'user'
            );

            // Assert
            expect(updatedUser.email).toBe(mockUser.email); // email не изменился
            expect(updatedUser.googleId).toBe(mockUser.googleId); // googleId не изменился
        });

        // ==================== ИЗМЕНЕНИЕ РОЛЕЙ ====================

        it('админ должен успешно изменить роль пользователя', async () => {
            // Arrange
            const updateData = { role: 'author' };
            const targetUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };

            mockUserModel.findById.mockResolvedValue(targetUser);

            // Act
            const result = await userService.updateProfile(
                mockUserId,
                updateData,
                mockAdminId,  // Админ делает запрос
                'admin'       // Роль админа
            );

            // Assert
            expect(targetUser.role).toBe('author');
            expect(targetUser.save).toHaveBeenCalled();
            expect(result.role).toBe('author');
        });

        it('обычный пользователь НЕ должен менять роли', async () => {
            // Arrange
            const updateData = { role: 'admin' };
            const targetUser = {
                ...mockUser,
                save: jest.fn()
            };

            mockUserModel.findById.mockResolvedValue(targetUser);

            // Act & Assert
            await expect(
                userService.updateProfile(
                    mockUserId,
                    updateData,
                    mockUserId,  // Обычный user пытается изменить роль
                    'user'       // Роль user
                )
            ).rejects.toThrow('Только администратор может изменять роли пользователей');

            expect(targetUser.save).not.toHaveBeenCalled();
        });

        it('author НЕ должен менять роли', async () => {
            // Arrange
            const updateData = { role: 'admin' };
            const authorUser = {
                ...mockUser,
                role: 'author',
                save: jest.fn()
            };

            mockUserModel.findById.mockResolvedValue(authorUser);

            // Act & Assert
            await expect(
                userService.updateProfile(
                    mockUserId,
                    updateData,
                    mockUserId,
                    'author'  // Роль author
                )
            ).rejects.toThrow('Только администратор может изменять роли пользователей');
        });

        it('админ НЕ должен изменять свою собственную роль', async () => {
            // Arrange
            const updateData = { role: 'user' };
            const adminUser = {
                ...mockAdmin,
                save: jest.fn()
            };

            mockUserModel.findById.mockResolvedValue(adminUser);

            // Act & Assert
            await expect(
                userService.updateProfile(
                    mockAdminId,
                    updateData,
                    mockAdminId,  // Админ пытается изменить свою роль
                    'admin'
                )
            ).rejects.toThrow('Нельзя изменить собственную роль администратора');

            expect(adminUser.save).not.toHaveBeenCalled();
        });

        // ==================== ВАЛИДАЦИЯ РОЛЕЙ ====================

        it('должен выбросить ошибку при попытке установить недопустимую роль', async () => {
            // Arrange
            const updateData = { role: 'superadmin' };  // ❌ Недопустимая роль
            const targetUser = {
                ...mockUser,
                save: jest.fn()
            };

            mockUserModel.findById.mockResolvedValue(targetUser);

            // Act & Assert
            await expect(
                userService.updateProfile(
                    mockUserId,
                    updateData,
                    mockAdminId,
                    'admin'
                )
            ).rejects.toThrow('Недопустимое значение роли. Разрешены: user, author, admin');

            expect(targetUser.save).not.toHaveBeenCalled();
        });

        it('должен принять валидные роли: user, author, admin', async () => {
            // Arrange
            const validRoles = ['user', 'author', 'admin'];

            for (const role of validRoles) {
                const updateData = { role };
                const targetUser = {
                    ...mockUser,
                    role: 'user',
                    save: jest.fn().mockResolvedValue(true)
                };

                mockUserModel.findById.mockResolvedValue(targetUser);

                // Act
                const result = await userService.updateProfile(
                    mockUserId,
                    updateData,
                    mockAdminId,
                    'admin'
                );

                // Assert
                expect(targetUser.role).toBe(role);
                expect(result.role).toBe(role);

                jest.clearAllMocks();
            }
        });

        // ==================== EDGE CASES ====================

        it('должен выбросить ошибку, если пользователь не найден', async () => {
            // Arrange
            mockUserModel.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(
                userService.updateProfile(
                    mockUserId,
                    { firstName: 'Test' },
                    mockUserId,
                    'user'
                )
            ).rejects.toThrow('Пользователь не найден');
        });

        it('должен корректно обработать пустой updateData', async () => {
            // Arrange
            const updateData = {};
            const targetUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };

            mockUserModel.findById.mockResolvedValue(targetUser);

            // Act
            const result = await userService.updateProfile(
                mockUserId,
                updateData,
                mockUserId,
                'user'
            );

            // Assert
            expect(targetUser.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('должен вызвать расшифровку после обновления', async () => {
            // Arrange
            const updateData = { firstName: 'Петр' };
            const updatedUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };

            mockUserModel.findById.mockResolvedValue(updatedUser);

            // Act
            await userService.updateProfile(
                mockUserId,
                updateData,
                mockUserId,
                'user'
            );

            // Assert
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledWith(updatedUser);
        });

        it('должен обработать ошибку при сохранении в БД', async () => {
            // Arrange
            const updateData = { firstName: 'Петр' };
            const errorMessage = 'Database save error';
            const targetUser = {
                ...mockUser,
                save: jest.fn().mockRejectedValue(new Error(errorMessage))
            };

            mockUserModel.findById.mockResolvedValue(targetUser);

            // Act & Assert
            await expect(
                userService.updateProfile(
                    mockUserId,
                    updateData,
                    mockUserId,
                    'user'
                )
            ).rejects.toThrow(errorMessage);
        });
    });

    // ==================== formatUserResponse ====================

    describe('formatUserResponse', () => {

        it('должен правильно форматировать ответ пользователя', () => {
            // Arrange
            const user = mockUser;

            // Act
            const result = userService.formatUserResponse(user);

            // Assert
            expect(result).toEqual({
                id: mockUser._id,
                email: mockUser.email,
                googleId: mockUser.googleId,
                firstName: mockUser.firstName,
                lastName: mockUser.lastName,
                avatar: mockUser.avatar,
                role: mockUser.role,
                bio: mockUser.bio,
                position: mockUser.position,
                showInAuthorsList: mockUser.showInAuthorsList,
                isBlocked: mockUser.isBlocked,
                lastLogin: mockUser.lastLogin,
                createdAt: mockUser.createdAt,
                updatedAt: mockUser.updatedAt
            });
        });

        it('должен исключить служебные поля (_id вместо id)', () => {
            // Arrange
            const user = { ...mockUser, __v: 5, $locals: {} };

            // Act
            const result = userService.formatUserResponse(user);

            // Assert
            expect(result.__v).toBeUndefined();
            expect(result.$locals).toBeUndefined();
            expect(result.id).toBe(mockUser._id);
            expect(result._id).toBeUndefined();
        });

        it('должен вернуть все обязательные поля', () => {
            // Arrange
            const requiredFields = [
                'id', 'email', 'googleId', 'firstName', 'lastName',
                'avatar', 'role', 'bio', 'position', 'showInAuthorsList',
                'isBlocked', 'lastLogin', 'createdAt', 'updatedAt'
            ];

            // Act
            const result = userService.formatUserResponse(mockUser);

            // Assert
            requiredFields.forEach(field => {
                expect(result).toHaveProperty(field);
            });
        });

        it('должен корректно обработать пользователя с минимальными данными', () => {
            // Arrange
            const minimalUser = {
                _id: 'minimal123',
                email: 'minimal@test.com',
                googleId: 'google789',
                firstName: '',
                lastName: '',
                avatar: '',
                role: 'user',
                bio: '',
                position: '',
                showInAuthorsList: false,
                isBlocked: { status: false },
                lastLogin: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Act
            const result = userService.formatUserResponse(minimalUser);

            // Assert
            expect(result.id).toBe('minimal123');
            expect(result.firstName).toBe('');
            expect(result.lastName).toBe('');
            expect(result.bio).toBe('');
        });
    });
});