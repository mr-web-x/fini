// ============================================
// tests/unit/services/authService.test.js
// ============================================

import { jest } from '@jest/globals';

// ==================== МОКИ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ====================

// ⚠️ ВАЖНО: Устанавливаем переменные окружения ДО импорта модулей
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRATION = '7d';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// ==================== СОЗДАЕМ МОКИ ====================

// Мок для jwt
const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn()
};

// Мок для Google OAuth2Client
const mockGoogleClient = {
    verifyIdToken: jest.fn()
};

// Мок для google-auth-library
const mockOAuth2Client = jest.fn(() => mockGoogleClient);

// Мок для UserModel
const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn()
};

// Мок для cryptoService
const mockCryptoService = {
    smartDecrypt: jest.fn((obj) => Promise.resolve(obj))
};

// Мокаем модули ПЕРЕД импортом authService
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: mockJwt
}));

jest.unstable_mockModule('google-auth-library', () => ({
    OAuth2Client: mockOAuth2Client
}));

jest.unstable_mockModule('../../../models/User.model.js', () => ({
    default: mockUserModel
}));

jest.unstable_mockModule('../../../services/cryptoService.js', () => ({
    default: mockCryptoService
}));

// Импортируем authService ПОСЛЕ настройки моков
const { default: authService } = await import('../../../services/authService.js');

// ==================== ТЕСТОВЫЕ ДАННЫЕ ====================

const mockGoogleToken = 'mock-google-token-12345';
const mockJwtToken = 'mock-jwt-token-67890';
const mockUserId = '507f1f77bcf86cd799439011';

const mockGooglePayload = {
    sub: 'google-id-123',
    email: 'test@example.com',
    given_name: 'Иван',
    family_name: 'Иванов',
    picture: 'https://example.com/avatar.jpg',
    iss: 'accounts.google.com',
    aud: process.env.GOOGLE_CLIENT_ID || 'mock-client-id'
};

const mockUser = {
    _id: mockUserId,
    email: 'test@example.com',
    googleId: 'google-id-123',
    firstName: 'Иван',
    lastName: 'Иванов',
    avatar: 'https://example.com/avatar.jpg',
    role: 'user',
    isBlocked: {
        status: false,
        until: null,
        reason: '',
        blockedBy: null
    },
    lastLogin: new Date('2024-01-01'),
    save: jest.fn()
};

const mockAuthor = {
    ...mockUser,
    _id: '507f1f77bcf86cd799439012',
    role: 'author'
};

const mockAdmin = {
    ...mockUser,
    _id: '507f1f77bcf86cd799439013',
    role: 'admin'
};

// ==================== НАСТРОЙКА ТЕСТОВ ====================

describe('AuthService', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        // Дефолтные реализации
        mockCryptoService.smartDecrypt.mockImplementation((obj) => Promise.resolve(obj));
        mockUserModel.findOne.mockResolvedValue(null);
        mockUserModel.findById.mockResolvedValue(null);
        mockUserModel.create.mockResolvedValue(mockUser);
    });

    // ==================== verifyGoogleToken ====================

    describe('verifyGoogleToken', () => {

        it('должен успешно верифицировать валидный Google токен', async () => {
            // Arrange
            const mockTicket = {
                getPayload: jest.fn().mockReturnValue(mockGooglePayload)
            };
            mockGoogleClient.verifyIdToken.mockResolvedValue(mockTicket);

            // Act
            const result = await authService.verifyGoogleToken(mockGoogleToken);

            // Assert
            expect(mockGoogleClient.verifyIdToken).toHaveBeenCalledWith({
                idToken: mockGoogleToken,
                audience: expect.any(String)
            });
            expect(result).toEqual({
                googleId: 'google-id-123',
                email: 'test@example.com',
                firstName: 'Иван',
                lastName: 'Иванов',
                avatar: 'https://example.com/avatar.jpg'
            });
        });

        it('должен выбросить ошибку при неверном издателе токена', async () => {
            // Arrange
            const invalidPayload = {
                ...mockGooglePayload,
                iss: 'invalid-issuer.com'
            };
            const mockTicket = {
                getPayload: jest.fn().mockReturnValue(invalidPayload)
            };
            mockGoogleClient.verifyIdToken.mockResolvedValue(mockTicket);

            // Act & Assert
            await expect(authService.verifyGoogleToken(mockGoogleToken))
                .rejects
                .toThrow('Неверный Google токен'); // ✅ Исправлено: выбрасывается общая ошибка
        });

        it('должен принять альтернативный издатель https://accounts.google.com', async () => {
            // Arrange
            const altPayload = {
                ...mockGooglePayload,
                iss: 'https://accounts.google.com'
            };
            const mockTicket = {
                getPayload: jest.fn().mockReturnValue(altPayload)
            };
            mockGoogleClient.verifyIdToken.mockResolvedValue(mockTicket);

            // Act
            const result = await authService.verifyGoogleToken(mockGoogleToken);

            // Assert
            expect(result.googleId).toBe('google-id-123');
        });

        it('должен выбросить ошибку при невалидном токене', async () => {
            // Arrange
            mockGoogleClient.verifyIdToken.mockRejectedValue(new Error('Invalid token'));

            // Act & Assert
            await expect(authService.verifyGoogleToken(mockGoogleToken))
                .rejects
                .toThrow('Неверный Google токен');
        });

        it('должен обработать отсутствующие имя и фамилию', async () => {
            // Arrange
            const payloadWithoutNames = {
                ...mockGooglePayload,
                given_name: undefined,
                family_name: undefined,
                picture: undefined
            };
            const mockTicket = {
                getPayload: jest.fn().mockReturnValue(payloadWithoutNames)
            };
            mockGoogleClient.verifyIdToken.mockResolvedValue(mockTicket);

            // Act
            const result = await authService.verifyGoogleToken(mockGoogleToken);

            // Assert
            expect(result.firstName).toBe('');
            expect(result.lastName).toBe('');
            expect(result.avatar).toBe('');
        });
    });

    // ==================== googleAuth ====================

    describe('googleAuth', () => {

        beforeEach(() => {
            // Дефолтная успешная верификация Google токена
            const mockTicket = {
                getPayload: jest.fn().mockReturnValue(mockGooglePayload)
            };
            mockGoogleClient.verifyIdToken.mockResolvedValue(mockTicket);
        });

        // ==================== СУЩЕСТВУЮЩИЙ ПОЛЬЗОВАТЕЛЬ ====================

        it('должен успешно авторизовать существующего пользователя', async () => {
            // Arrange
            const existingUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };
            mockUserModel.findOne.mockResolvedValue(existingUser);
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            const result = await authService.googleAuth(mockGoogleToken);

            // Assert
            expect(mockUserModel.findOne).toHaveBeenCalledWith({
                googleId: 'google-id-123'
            });
            expect(existingUser.save).toHaveBeenCalled();
            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('token');
            expect(result.token).toBe(mockJwtToken);
            expect(result.user.userId).toBe(mockUserId);
        });

        it('должен обновить lastLogin при входе существующего пользователя', async () => {
            // Arrange
            const existingUser = {
                ...mockUser,
                lastLogin: new Date('2024-01-01'),
                save: jest.fn().mockResolvedValue(true)
            };
            mockUserModel.findOne.mockResolvedValue(existingUser);
            mockJwt.sign.mockReturnValue(mockJwtToken);

            const beforeLogin = existingUser.lastLogin;

            // Act
            await authService.googleAuth(mockGoogleToken);

            // Assert
            expect(existingUser.lastLogin).not.toEqual(beforeLogin);
            expect(existingUser.save).toHaveBeenCalled();
        });

        it('должен выбросить ошибку при блокировке пользователя навсегда', async () => {
            // Arrange
            const blockedUser = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: null,
                    reason: 'Нарушение правил',
                    blockedBy: 'admin-id'
                }
            };
            mockUserModel.findOne.mockResolvedValue(blockedUser);

            // Act & Assert
            await expect(authService.googleAuth(mockGoogleToken))
                .rejects
                .toThrow('Аккаунт заблокирован навсегда');
        });

        it('должен выбросить ошибку при временной блокировке пользователя', async () => {
            // Arrange
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // через 7 дней

            const blockedUser = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: futureDate,
                    reason: 'Спам',
                    blockedBy: 'admin-id'
                }
            };
            mockUserModel.findOne.mockResolvedValue(blockedUser);

            // Act & Assert
            await expect(authService.googleAuth(mockGoogleToken))
                .rejects
                .toThrow(/Аккаунт заблокирован до/);
        });

        it('должен автоматически разблокировать пользователя если срок истёк', async () => {
            // Arrange
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7); // 7 дней назад

            const unblockedUser = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: pastDate,
                    reason: 'Старая блокировка',
                    blockedBy: 'admin-id'
                },
                save: jest.fn().mockResolvedValue(true)
            };
            mockUserModel.findOne.mockResolvedValue(unblockedUser);
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            const result = await authService.googleAuth(mockGoogleToken);

            // Assert
            expect(unblockedUser.isBlocked.status).toBe(false);
            expect(unblockedUser.isBlocked.until).toBe(null);
            expect(unblockedUser.isBlocked.reason).toBe('');
            expect(unblockedUser.save).toHaveBeenCalledTimes(2); // 1 раз разблокировка + 1 раз lastLogin
            expect(result).toHaveProperty('token');
        });

        // ==================== НОВЫЙ ПОЛЬЗОВАТЕЛЬ ====================

        it('должен создать нового пользователя при первом входе', async () => {
            // Arrange
            mockUserModel.findOne.mockResolvedValue(null); // Пользователь не найден
            const newUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };
            mockUserModel.create.mockResolvedValue(newUser);
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            const result = await authService.googleAuth(mockGoogleToken);

            // Assert
            expect(mockUserModel.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                googleId: 'google-id-123',
                firstName: 'Иван',
                lastName: 'Иванов',
                avatar: 'https://example.com/avatar.jpg',
                role: 'user',
                lastLogin: expect.any(Date)
            });
            expect(result.user.userId).toBe(mockUserId);
            expect(result.token).toBe(mockJwtToken);
        });

        it('должен установить роль user для нового пользователя', async () => {
            // Arrange
            mockUserModel.findOne.mockResolvedValue(null);
            const newUser = { ...mockUser };
            mockUserModel.create.mockResolvedValue(newUser);
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            await authService.googleAuth(mockGoogleToken);

            // Assert
            expect(mockUserModel.create).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'user' })
            );
        });

        it('должен вызвать расшифровку данных пользователя', async () => {
            // Arrange
            const existingUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };
            mockUserModel.findOne.mockResolvedValue(existingUser);
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            await authService.googleAuth(mockGoogleToken);

            // Assert
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledWith(existingUser);
        });

        it('должен обработать ошибку расшифровки без падения', async () => {
            // Arrange
            const existingUser = {
                ...mockUser,
                save: jest.fn().mockResolvedValue(true)
            };
            mockUserModel.findOne.mockResolvedValue(existingUser);
            mockCryptoService.smartDecrypt.mockRejectedValue(new Error('Decrypt error'));
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act & Assert
            await expect(authService.googleAuth(mockGoogleToken))
                .resolves
                .toHaveProperty('token');
        });
    });

    // ==================== getUserFromToken ====================

    describe('getUserFromToken', () => {

        it('должен получить пользователя по валидному JWT токену', async () => {
            // Arrange
            mockJwt.verify.mockReturnValue({ userId: mockUserId });
            mockUserModel.findById.mockResolvedValue(mockUser);

            // Act
            const result = await authService.getUserFromToken(mockJwtToken);

            // Assert
            expect(mockJwt.verify).toHaveBeenCalledWith(mockJwtToken, expect.any(String));
            expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
            expect(result._id).toBe(mockUserId);
        });

        it('должен выбросить ошибку если пользователь не найден', async () => {
            // Arrange
            mockJwt.verify.mockReturnValue({ userId: mockUserId });
            mockUserModel.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(authService.getUserFromToken(mockJwtToken))
                .rejects
                .toThrow('Пользователь не найден');
        });

        it('должен выбросить ошибку при истекшем токене', async () => {
            // Arrange
            const error = new Error('Token expired');
            error.name = 'TokenExpiredError';
            mockJwt.verify.mockImplementation(() => { throw error; });

            // Act & Assert
            await expect(authService.getUserFromToken(mockJwtToken))
                .rejects
                .toThrow('Токен истек');
        });

        it('должен выбросить ошибку при невалидном токене', async () => {
            // Arrange
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            mockJwt.verify.mockImplementation(() => { throw error; });

            // Act & Assert
            await expect(authService.getUserFromToken(mockJwtToken))
                .rejects
                .toThrow('Неверный токен');
        });

        it('должен проверить статус блокировки пользователя', async () => {
            // Arrange
            const blockedUser = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: null,
                    reason: 'Banned',
                    blockedBy: 'admin'
                }
            };
            mockJwt.verify.mockReturnValue({ userId: mockUserId });
            mockUserModel.findById.mockResolvedValue(blockedUser);

            // Act & Assert
            await expect(authService.getUserFromToken(mockJwtToken))
                .rejects
                .toThrow(/заблокирован/);
        });

        it('должен вызвать расшифровку данных пользователя', async () => {
            // Arrange
            mockJwt.verify.mockReturnValue({ userId: mockUserId });
            mockUserModel.findById.mockResolvedValue(mockUser);

            // Act
            await authService.getUserFromToken(mockJwtToken);

            // Assert
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledWith(mockUser);
        });
    });

    // ==================== validateUserStatus ====================

    describe('validateUserStatus', () => {

        it('должен вернуть valid:true для незаблокированного пользователя', async () => {
            // Arrange
            const user = { ...mockUser };

            // Act
            const result = await authService.validateUserStatus(user);

            // Assert
            expect(result).toEqual({ valid: true });
        });

        it('должен вернуть ошибку для навсегда заблокированного пользователя', async () => {
            // Arrange
            const user = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: null,
                    reason: 'Нарушение правил',
                    blockedBy: 'admin'
                }
            };

            // Act
            const result = await authService.validateUserStatus(user);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toContain('заблокирован навсегда');
            expect(result.message).toContain('Нарушение правил');
        });

        it('должен вернуть ошибку для временно заблокированного пользователя', async () => {
            // Arrange
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5);

            const user = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: futureDate,
                    reason: 'Спам',
                    blockedBy: 'admin'
                }
            };

            // Act
            const result = await authService.validateUserStatus(user);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toContain('заблокирован до');
            expect(result.message).toContain('Осталось дней:');
        });

        it('должен автоматически разблокировать пользователя если срок истёк', async () => {
            // Arrange
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10);

            const user = {
                ...mockUser,
                isBlocked: {
                    status: true,
                    until: pastDate,
                    reason: 'Старая блокировка',
                    blockedBy: 'admin'
                },
                save: jest.fn().mockResolvedValue(true)
            };

            // Act
            const result = await authService.validateUserStatus(user);

            // Assert
            expect(result.valid).toBe(true);
            expect(user.isBlocked.status).toBe(false);
            expect(user.isBlocked.until).toBe(null);
            expect(user.isBlocked.reason).toBe('');
            expect(user.isBlocked.blockedBy).toBe(null);
            expect(user.save).toHaveBeenCalled();
        });

        it('должен обработать ошибку при валидации', async () => {
            // Arrange
            const user = {
                ...mockUser,
                save: jest.fn().mockRejectedValue(new Error('Database error'))
            };
            user.isBlocked.status = true;
            user.isBlocked.until = new Date('2020-01-01');

            // Act
            const result = await authService.validateUserStatus(user);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.message).toContain('Ошибка проверки статуса');
        });
    });

    // ==================== generateToken ====================

    describe('generateToken', () => {

        it('должен сгенерировать JWT токен с правильным payload', () => {
            // Arrange
            const user = mockUser;
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            const token = authService.generateToken(user);

            // Assert
            expect(mockJwt.sign).toHaveBeenCalledWith(
                { userId: mockUserId },
                expect.any(String),
                expect.objectContaining({
                    expiresIn: expect.any(String),
                    issuer: 'fini.sk',
                    audience: 'fini-users'
                })
            );
            expect(token).toBe(mockJwtToken);
        });

        it('должен использовать правильные параметры токена', () => {
            // Arrange
            const user = mockUser;
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            authService.generateToken(user);

            // Assert
            const callArgs = mockJwt.sign.mock.calls[0];
            expect(callArgs[2]).toHaveProperty('issuer', 'fini.sk');
            expect(callArgs[2]).toHaveProperty('audience', 'fini-users');
            expect(callArgs[2]).toHaveProperty('expiresIn');
        });

        it('должен включить только userId в payload', () => {
            // Arrange
            const user = mockUser;
            mockJwt.sign.mockReturnValue(mockJwtToken);

            // Act
            authService.generateToken(user);

            // Assert
            const payload = mockJwt.sign.mock.calls[0][0];
            expect(payload).toEqual({ userId: mockUserId });
            expect(payload).not.toHaveProperty('email');
            expect(payload).not.toHaveProperty('role');
        });
    });

    // ==================== refreshToken ====================

    describe('refreshToken', () => {

        it('должен обновить токен для валидного старого токена', async () => {
            // Arrange
            mockJwt.verify.mockReturnValue({ userId: mockUserId });
            mockUserModel.findById.mockResolvedValue(mockUser);
            mockJwt.sign.mockReturnValue('new-token-12345');

            // Act
            const newToken = await authService.refreshToken(mockJwtToken);

            // Assert
            expect(mockJwt.verify).toHaveBeenCalledWith(mockJwtToken, expect.any(String));
            expect(mockJwt.sign).toHaveBeenCalled();
            expect(newToken).toBe('new-token-12345');
        });

        it('должен выбросить ошибку при невалидном токене', async () => {
            // Arrange
            mockJwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            // Act & Assert
            await expect(authService.refreshToken(mockJwtToken))
                .rejects
                .toThrow('Не удалось обновить токен');
        });

        it('должен выбросить ошибку если пользователь не найден', async () => {
            // Arrange
            mockJwt.verify.mockReturnValue({ userId: mockUserId });
            mockUserModel.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(authService.refreshToken(mockJwtToken))
                .rejects
                .toThrow('Не удалось обновить токен');
        });
    });

    // ==================== checkRole ====================

    describe('checkRole', () => {

        it('user должен иметь доступ к user роли', () => {
            // Arrange
            const user = { role: 'user' };

            // Act
            const result = authService.checkRole(user, 'user');

            // Assert
            expect(result).toBe(true);
        });

        it('author должен иметь доступ к user роли', () => {
            // Arrange
            const user = { role: 'author' };

            // Act
            const result = authService.checkRole(user, 'user');

            // Assert
            expect(result).toBe(true);
        });

        it('admin должен иметь доступ к author роли', () => {
            // Arrange
            const user = { role: 'admin' };

            // Act
            const result = authService.checkRole(user, 'author');

            // Assert
            expect(result).toBe(true);
        });

        it('user НЕ должен иметь доступ к admin роли', () => {
            // Arrange
            const user = { role: 'user' };

            // Act
            const result = authService.checkRole(user, 'admin');

            // Assert
            expect(result).toBe(false);
        });

        it('author НЕ должен иметь доступ к admin роли', () => {
            // Arrange
            const user = { role: 'author' };

            // Act
            const result = authService.checkRole(user, 'admin');

            // Assert
            expect(result).toBe(false);
        });

        it('admin должен иметь доступ ко всем ролям', () => {
            // Arrange
            const user = { role: 'admin' };

            // Act & Assert
            expect(authService.checkRole(user, 'user')).toBe(true);
            expect(authService.checkRole(user, 'author')).toBe(true);
            expect(authService.checkRole(user, 'admin')).toBe(true);
        });
    });

    // ==================== canWriteArticles ====================

    describe('canWriteArticles', () => {

        it('user НЕ может писать статьи', () => {
            // Arrange
            const user = { role: 'user' };

            // Act
            const result = authService.canWriteArticles(user);

            // Assert
            expect(result).toBe(false);
        });

        it('author может писать статьи', () => {
            // Arrange
            const user = { role: 'author' };

            // Act
            const result = authService.canWriteArticles(user);

            // Assert
            expect(result).toBe(true);
        });

        it('admin может писать статьи', () => {
            // Arrange
            const user = { role: 'admin' };

            // Act
            const result = authService.canWriteArticles(user);

            // Assert
            expect(result).toBe(true);
        });
    });

    // ==================== canModerate ====================

    describe('canModerate', () => {

        it('user НЕ может модерировать', () => {
            // Arrange
            const user = { role: 'user' };

            // Act
            const result = authService.canModerate(user);

            // Assert
            expect(result).toBe(false);
        });

        it('author НЕ может модерировать', () => {
            // Arrange
            const user = { role: 'author' };

            // Act
            const result = authService.canModerate(user);

            // Assert
            expect(result).toBe(false);
        });

        it('admin может модерировать', () => {
            // Arrange
            const user = { role: 'admin' };

            // Act
            const result = authService.canModerate(user);

            // Assert
            expect(result).toBe(true);
        });
    });
});