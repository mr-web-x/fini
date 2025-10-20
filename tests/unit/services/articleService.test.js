// ============================================
// tests/unit/services/articleService.test.js
// ============================================

import { jest } from '@jest/globals';

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФАБРИКИ МОКОВ ====================

/**
 * Создает then-able объект, имитирующий mongoose Query
 * Поддерживает цепочки:
 *   .populate().populate().sort().limit().skip().exec()
 * и обычный await без exec()
 */
function createQueryChain(returnValue) {
    const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(returnValue),
        then: (resolve, reject) => Promise.resolve(returnValue).then(resolve, reject),
    };
    return chain;
}

// ==================== СОЗДАЕМ МОКИ МОДЕЛЕЙ ====================

// Мок для Article
const mockArticle = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
};

// Мок для User
const mockUser = {
    findById: jest.fn(),
};

// Мок для Category
const mockCategory = {
    findById: jest.fn(),
};

// Мок для cryptoService
const mockCryptoService = {
    smartDecrypt: jest.fn((obj) => Promise.resolve(obj)),
};

// Мок для logger
const mockLogger = {
    writeLog: jest.fn(),
};

// Мокаем модули ПЕРЕД импортом articleService
jest.unstable_mockModule('../../../models/Article.model.js', () => ({
    default: mockArticle,
}));

jest.unstable_mockModule('../../../models/User.model.js', () => ({
    default: mockUser,
}));

jest.unstable_mockModule('../../../models/Category.model.js', () => ({
    default: mockCategory,
}));

jest.unstable_mockModule('../../../services/cryptoService.js', () => ({
    default: mockCryptoService,
}));

jest.unstable_mockModule('../../../middlewares/logger.js', () => ({
    writeLog: mockLogger.writeLog,
}));

// Импортируем articleService ПОСЛЕ настройки моков
const { default: articleService } = await import('../../../services/articleService.js');

// ==================== ТЕСТОВЫЕ ДАННЫЕ ====================

const mockAuthorId = '507f1f77bcf86cd799439011';
const mockAdminId = '507f1f77bcf86cd799439012';
const mockUserId = '507f1f77bcf86cd799439013';
const mockCategoryId = '507f1f77bcf86cd799439014';
const mockArticleId = '507f1f77bcf86cd799439015';

const mockAuthorUser = {
    _id: mockAuthorId,
    email: 'author@example.com',
    role: 'author',
    isBlocked: { status: false },
};

const mockAdminUser = {
    _id: mockAdminId,
    email: 'admin@example.com',
    role: 'admin',
    isBlocked: { status: false },
};

const mockRegularUser = {
    _id: mockUserId,
    email: 'user@example.com',
    role: 'user',
    isBlocked: { status: false },
};

const mockCategoryData = {
    _id: mockCategoryId,
    name: 'Технологии',
    slug: 'tech',
};

const mockArticleData = {
    title: 'Тестовая статья',
    slug: 'test-article',
    excerpt: 'Краткое описание статьи для тестирования',
    content: 'Полный текст статьи',
    category: mockCategoryId,
    tags: ['test', 'article'],
};

const mockArticleDoc = {
    _id: mockArticleId,
    ...mockArticleData,
    author: mockAuthorId,
    status: 'draft',
    views: 0,
    createdAt: new Date(),
    save: jest.fn(),
};

// ==================== НАСТРОЙКА ТЕСТОВ ====================

describe('ArticleService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCryptoService.smartDecrypt.mockImplementation((obj) => Promise.resolve(obj));
    });

    // ==================== createArticle ====================
    describe('createArticle', () => {
        it('должен успешно создать статью автором', async () => {
            // Arrange
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockCategory.findById.mockResolvedValue(mockCategoryData);
            mockArticle.findOne.mockResolvedValue(null);
            mockArticle.create.mockResolvedValue(mockArticleDoc);

            // После создания сервис вызывает getArticleById -> findById().populate().populate()
            mockArticle.findById.mockReturnValue(createQueryChain(mockArticleDoc));

            // Act
            const result = await articleService.createArticle(mockArticleData, mockAuthorId);

            // Assert
            expect(mockUser.findById).toHaveBeenCalledWith(mockAuthorId);
            expect(mockCategory.findById).toHaveBeenCalledWith(mockCategoryId);
            expect(mockArticle.findOne).toHaveBeenCalledWith({ slug: 'test-article' });
            expect(mockArticle.create).toHaveBeenCalledWith({
                ...mockArticleData,
                author: mockAuthorId,
                status: 'draft',
            });
            expect(result).toBeDefined();
        });

        it('должен успешно создать статью админом', async () => {
            // Arrange
            mockUser.findById.mockResolvedValue(mockAdminUser);
            mockCategory.findById.mockResolvedValue(mockCategoryData);
            mockArticle.findOne.mockResolvedValue(null);
            mockArticle.create.mockResolvedValue(mockArticleDoc);

            mockArticle.findById.mockReturnValue(createQueryChain(mockArticleDoc));

            // Act
            const result = await articleService.createArticle(mockArticleData, mockAdminId);

            // Assert
            expect(mockArticle.create).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'draft' }),
            );
            expect(result).toBeDefined();
        });

        it('должен установить статус draft по умолчанию', async () => {
            // Arrange
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockCategory.findById.mockResolvedValue(mockCategoryData);
            mockArticle.findOne.mockResolvedValue(null);
            mockArticle.create.mockResolvedValue(mockArticleDoc);

            mockArticle.findById.mockReturnValue(createQueryChain(mockArticleDoc));

            // Act
            await articleService.createArticle(mockArticleData, mockAuthorId);

            // Assert
            expect(mockArticle.create).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'draft' }),
            );
        });

        it('должен выбросить ошибку если автор не найден', async () => {
            mockUser.findById.mockResolvedValue(null);

            await expect(articleService.createArticle(mockArticleData, mockAuthorId))
                .rejects.toThrow('Автор не найден');
        });

        it('должен выбросить ошибку если user пытается создать статью', async () => {
            mockUser.findById.mockResolvedValue(mockRegularUser);

            await expect(articleService.createArticle(mockArticleData, mockUserId))
                .rejects.toThrow('У вас нет прав на создание статей');
        });

        it('должен выбросить ошибку если автор заблокирован', async () => {
            const blockedAuthor = {
                ...mockAuthorUser,
                isBlocked: { status: true },
            };
            mockUser.findById.mockResolvedValue(blockedAuthor);

            await expect(articleService.createArticle(mockArticleData, mockAuthorId))
                .rejects.toThrow('Ваш аккаунт заблокирован');
        });

        it('должен выбросить ошибку если категория не найдена', async () => {
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockCategory.findById.mockResolvedValue(null);

            await expect(articleService.createArticle(mockArticleData, mockAuthorId))
                .rejects.toThrow('Категория не найдена');
        });

        it('должен выбросить ошибку при дубликате slug', async () => {
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockCategory.findById.mockResolvedValue(mockCategoryData);
            mockArticle.findOne.mockResolvedValue(mockArticleDoc);

            await expect(articleService.createArticle(mockArticleData, mockAuthorId))
                .rejects.toThrow('Статья с таким slug уже существует');
        });
    });

    // ==================== getArticleById ====================
    describe('getArticleById', () => {
        it('должен успешно получить статью по ID', async () => {
            // Arrange
            mockArticle.findById.mockReturnValue(createQueryChain(mockArticleDoc));

            // Act
            const result = await articleService.getArticleById(mockArticleId);

            // Assert
            expect(mockArticle.findById).toHaveBeenCalledWith(mockArticleId);
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledWith(mockArticleDoc);
            expect(result).toEqual(mockArticleDoc);
        });

        it('должен выбросить ошибку если статья не найдена', async () => {
            mockArticle.findById.mockReturnValue(createQueryChain(null));

            await expect(articleService.getArticleById(mockArticleId))
                .rejects.toThrow('Статья не найдена');
        });

        it('должен вызвать расшифровку автора', async () => {
            mockArticle.findById.mockReturnValue(createQueryChain(mockArticleDoc));

            await articleService.getArticleById(mockArticleId);

            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledTimes(1);
        });
    });

    // ==================== getArticleBySlug ====================
    describe('getArticleBySlug', () => {
        it('должен успешно получить статью по slug', async () => {
            mockArticle.findOne.mockReturnValue(createQueryChain(mockArticleDoc));

            const result = await articleService.getArticleBySlug('test-article');

            expect(mockArticle.findOne).toHaveBeenCalledWith({ slug: 'test-article' });
            expect(result).toEqual(mockArticleDoc);
        });

        it('должен выбросить ошибку если статья не найдена', async () => {
            mockArticle.findOne.mockReturnValue(createQueryChain(null));

            await expect(articleService.getArticleBySlug('non-existent'))
                .rejects.toThrow('Статья не найдена');
        });
    });

    // ==================== updateArticle ====================
    describe('updateArticle', () => {
        it('автор должен успешно обновить свою draft статью', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                save: jest.fn().mockResolvedValue(true),
            };

            // первый вызов findById внутри updateArticle (без populate)
            mockArticle.findById.mockReturnValueOnce(Promise.resolve(draftArticle));
            // второй вызов findById из getArticleById -> populate().populate()
            mockArticle.findById.mockReturnValue(createQueryChain(draftArticle));
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            const updateData = { title: 'Обновленный заголовок' };

            await articleService.updateArticle(mockArticleId, updateData, mockAuthorId);

            expect(draftArticle.title).toBe('Обновленный заголовок');
            expect(draftArticle.save).toHaveBeenCalled();
        });

        it('admin должен успешно обновить любую draft статью', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                author: mockAuthorId,
                save: jest.fn().mockResolvedValue(true),
            };
            mockArticle.findById
                .mockReturnValueOnce(Promise.resolve(draftArticle))
                .mockReturnValue(createQueryChain(draftArticle));
            mockUser.findById.mockResolvedValue(mockAdminUser);

            const updateData = { title: 'Админ обновил' };

            await articleService.updateArticle(mockArticleId, updateData, mockAdminId);

            expect(draftArticle.save).toHaveBeenCalled();
        });

        it('должен выбросить ошибку при попытке редактировать published статью', async () => {
            mockArticle.findById.mockResolvedValue({ ...mockArticleDoc, status: 'published' });

            await expect(articleService.updateArticle(mockArticleId, {}, mockAuthorId))
                .rejects.toThrow('Опубликованные статьи нельзя редактировать');
        });

        it('должен выбросить ошибку при попытке редактировать чужую статью', async () => {
            const draftArticle = { ...mockArticleDoc, status: 'draft', author: mockAuthorId };
            mockArticle.findById.mockResolvedValue(draftArticle);
            mockUser.findById.mockResolvedValue(mockRegularUser);

            await expect(articleService.updateArticle(mockArticleId, {}, mockUserId))
                .rejects.toThrow('У вас нет прав на редактирование этой статьи');
        });

        it('pending статью может редактировать только admin', async () => {
            const pendingArticle = { ...mockArticleDoc, status: 'pending', author: mockAuthorId };
            mockArticle.findById.mockResolvedValue(pendingArticle);
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            await expect(articleService.updateArticle(mockArticleId, {}, mockAuthorId))
                .rejects.toThrow('Статья на модерации. Дождитесь решения администратора.');
        });

        it('должен проверить уникальность slug при изменении', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                slug: 'old-slug',
                save: jest.fn().mockResolvedValue(true),
            };
            mockArticle.findById.mockResolvedValue(draftArticle);
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockArticle.findOne.mockResolvedValue({ _id: 'other-article-id' });

            await expect(
                articleService.updateArticle(mockArticleId, { slug: 'new-slug' }, mockAuthorId),
            ).rejects.toThrow('Статья с таким slug уже существует');
        });

        it('должен обновить только разрешенные поля', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                views: 100,
                save: jest.fn().mockResolvedValue(true),
            };

            mockArticle.findById
                .mockReturnValueOnce(Promise.resolve(draftArticle)) // внутри update
                .mockReturnValue(createQueryChain(draftArticle));   // внутри getArticleById
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            const updateData = {
                title: 'Новый заголовок',
                views: 999999,
                author: 'new-author-id',
            };

            await articleService.updateArticle(mockArticleId, updateData, mockAuthorId);

            expect(draftArticle.title).toBe('Новый заголовок'); // изменился
            expect(draftArticle.views).toBe(100);               // запрещено изменять
            expect(draftArticle.author).toBe(mockAuthorId);     // автор не меняется
        });
    });

    // ==================== deleteArticle ====================
    describe('deleteArticle', () => {
        it('автор должен успешно удалить свою draft статью', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                author: mockAuthorId,
            };
            mockArticle.findById.mockResolvedValue(draftArticle);
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockArticle.findByIdAndDelete.mockResolvedValue(draftArticle);

            const result = await articleService.deleteArticle(mockArticleId, mockAuthorId);

            expect(mockArticle.findByIdAndDelete).toHaveBeenCalledWith(mockArticleId);
            expect(result.success).toBe(true);
        });

        it('admin должен успешно удалить published статью', async () => {
            const publishedArticle = {
                ...mockArticleDoc,
                status: 'published',
            };
            mockArticle.findById.mockResolvedValue(publishedArticle);
            mockUser.findById.mockResolvedValue(mockAdminUser);
            mockArticle.findByIdAndDelete.mockResolvedValue(publishedArticle);

            const result = await articleService.deleteArticle(mockArticleId, mockAdminId);

            expect(result.success).toBe(true);
        });

        it('должен выбросить ошибку при попытке удалить pending статью', async () => {
            const pendingArticle = {
                ...mockArticleDoc,
                status: 'pending',
            };
            mockArticle.findById.mockResolvedValue(pendingArticle);
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            await expect(articleService.deleteArticle(mockArticleId, mockAuthorId))
                .rejects.toThrow('Статья находится на модерации и не может быть удалена. Дождитесь решения администратора.');
        });

        it('author НЕ может удалить published статью', async () => {
            const publishedArticle = {
                ...mockArticleDoc,
                status: 'published',
                author: mockAuthorId,
            };
            mockArticle.findById.mockResolvedValue(publishedArticle);
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            await expect(articleService.deleteArticle(mockArticleId, mockAuthorId))
                .rejects.toThrow('Опубликованные статьи может удалять только администратор');
        });

        it('должен выбросить ошибку при попытке удалить чужую статью', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                author: mockAuthorId,
            };
            mockArticle.findById.mockResolvedValue(draftArticle);
            mockUser.findById.mockResolvedValue(mockRegularUser);

            await expect(articleService.deleteArticle(mockArticleId, mockUserId))
                .rejects.toThrow('У вас нет прав на удаление этой статьи');
        });

        it('автор должен успешно удалить свою rejected статью', async () => {
            const rejectedArticle = {
                ...mockArticleDoc,
                status: 'rejected',
                author: mockAuthorId,
            };
            mockArticle.findById.mockResolvedValue(rejectedArticle);
            mockUser.findById.mockResolvedValue(mockAuthorUser);
            mockArticle.findByIdAndDelete.mockResolvedValue(rejectedArticle);

            const result = await articleService.deleteArticle(mockArticleId, mockAuthorId);

            expect(result.success).toBe(true);
        });
    });

    // ==================== submitForReview ====================
    describe('submitForReview', () => {
        it('должен успешно отправить draft статью на модерацию', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                author: mockAuthorId,
                save: jest.fn().mockResolvedValue(true),
            };

            // первый вызов findById (без populate)
            mockArticle.findById.mockReturnValueOnce(Promise.resolve(draftArticle));
            // второй вызов из getArticleById
            mockArticle.findById.mockReturnValue(createQueryChain({ ...draftArticle, status: 'pending' }));

            const result = await articleService.submitForReview(mockArticleId, mockAuthorId);

            expect(draftArticle.status).toBe('pending');
            expect(draftArticle.submittedAt).toBeInstanceOf(Date);
            expect(draftArticle.save).toHaveBeenCalled();
            expect(result.status).toBe('pending');
        });

        it('должен успешно отправить rejected статью на повторную модерацию', async () => {
            const rejectedArticle = {
                ...mockArticleDoc,
                status: 'rejected',
                author: mockAuthorId,
                rejectionReason: 'Старая причина',
                rejectedBy: mockAdminId,
                rejectedAt: new Date(),
                save: jest.fn().mockResolvedValue(true),
            };

            mockArticle.findById
                .mockReturnValueOnce(Promise.resolve(rejectedArticle))
                .mockReturnValue(createQueryChain({ ...rejectedArticle, status: 'pending' }));

            await articleService.submitForReview(mockArticleId, mockAuthorId);

            expect(rejectedArticle.status).toBe('pending');
            expect(rejectedArticle.rejectionReason).toBe('');
            expect(rejectedArticle.rejectedBy).toBe(null);
            expect(rejectedArticle.rejectedAt).toBe(null);
        });

        it('должен выбросить ошибку если пользователь не является автором', async () => {
            const draftArticle = {
                ...mockArticleDoc,
                status: 'draft',
                author: mockAuthorId,
            };
            mockArticle.findById.mockResolvedValue(draftArticle);

            await expect(articleService.submitForReview(mockArticleId, mockUserId))
                .rejects.toThrow('Вы не являетесь автором этой статьи');
        });

        it('должен выбросить ошибку при попытке отправить published статью', async () => {
            const publishedArticle = {
                ...mockArticleDoc,
                status: 'published',
                author: mockAuthorId,
            };
            mockArticle.findById.mockResolvedValue(publishedArticle);

            await expect(articleService.submitForReview(mockArticleId, mockAuthorId))
                .rejects.toThrow(/не может быть отправлена на модерацию/);
        });

        it('должен очистить данные об отклонении', async () => {
            const rejectedArticle = {
                ...mockArticleDoc,
                status: 'rejected',
                author: mockAuthorId,
                rejectionReason: 'Плохо написано',
                rejectedBy: mockAdminId,
                rejectedAt: new Date(),
                save: jest.fn().mockResolvedValue(true),
            };

            mockArticle.findById
                .mockReturnValueOnce(Promise.resolve(rejectedArticle))
                .mockReturnValue(createQueryChain({ ...rejectedArticle, status: 'pending' }));

            await articleService.submitForReview(mockArticleId, mockAuthorId);

            expect(rejectedArticle.rejectionReason).toBe('');
            expect(rejectedArticle.rejectedBy).toBe(null);
            expect(rejectedArticle.rejectedAt).toBe(null);
        });
    });

    // ==================== approveArticle ====================
    describe('approveArticle', () => {
        it('admin должен успешно одобрить pending статью', async () => {
            const pendingArticle = {
                ...mockArticleDoc,
                status: 'pending',
                save: jest.fn().mockResolvedValue(true),
            };

            // approveArticle делает findById().populate('author')
            mockArticle.findById
                .mockReturnValueOnce(createQueryChain(pendingArticle)) // первый вызов внутри approve
                .mockReturnValue(createQueryChain({ ...pendingArticle, status: 'published' })); // вызов из getArticleById

            mockUser.findById.mockResolvedValue(mockAdminUser);

            const result = await articleService.approveArticle(mockArticleId, mockAdminId);

            expect(pendingArticle.status).toBe('published');
            expect(pendingArticle.publishedAt).toBeInstanceOf(Date);
            expect(pendingArticle.save).toHaveBeenCalled();
            expect(result.status).toBe('published');
        });

        it('должен выбросить ошибку если не admin', async () => {
            const pendingArticle = { ...mockArticleDoc, status: 'pending' };
            mockArticle.findById.mockReturnValue(createQueryChain(pendingArticle));
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            await expect(articleService.approveArticle(mockArticleId, mockAuthorId))
                .rejects.toThrow('Только администратор может одобрять статьи');
        });

        it('должен выбросить ошибку если статья не pending', async () => {
            const draftArticle = { ...mockArticleDoc, status: 'draft' };
            mockArticle.findById.mockReturnValue(createQueryChain(draftArticle));
            mockUser.findById.mockResolvedValue(mockAdminUser);

            await expect(articleService.approveArticle(mockArticleId, mockAdminId))
                .rejects.toThrow('Можно одобрить только статьи на модерации');
        });

        it('должен очистить данные об отклонении при одобрении', async () => {
            const pendingArticle = {
                ...mockArticleDoc,
                status: 'pending',
                rejectionReason: 'Старая причина',
                rejectedBy: mockAdminId,
                rejectedAt: new Date(),
                save: jest.fn().mockResolvedValue(true),
            };

            mockArticle.findById
                .mockReturnValueOnce(createQueryChain(pendingArticle))
                .mockReturnValue(createQueryChain({ ...pendingArticle, status: 'published' }));
            mockUser.findById.mockResolvedValue(mockAdminUser);

            await articleService.approveArticle(mockArticleId, mockAdminId);

            expect(pendingArticle.rejectionReason).toBe('');
            expect(pendingArticle.rejectedBy).toBe(null);
            expect(pendingArticle.rejectedAt).toBe(null);
        });
    });

    // ==================== rejectArticle ====================
    describe('rejectArticle', () => {
        it('admin должен успешно отклонить pending статью', async () => {
            const pendingArticle = {
                ...mockArticleDoc,
                status: 'pending',
                save: jest.fn().mockResolvedValue(true),
            };

            mockArticle.findById
                .mockReturnValueOnce(createQueryChain(pendingArticle)) // первый вызов внутри reject
                .mockReturnValue(createQueryChain({ ...pendingArticle, status: 'rejected' })); // getArticleById

            mockUser.findById.mockResolvedValue(mockAdminUser);

            const reason = 'Недостаточно качественный контент';

            const result = await articleService.rejectArticle(mockArticleId, mockAdminId, reason);

            expect(pendingArticle.status).toBe('rejected');
            expect(pendingArticle.rejectionReason).toBe(reason);
            expect(pendingArticle.rejectedBy).toBe(mockAdminId);
            expect(pendingArticle.rejectedAt).toBeInstanceOf(Date);
            expect(pendingArticle.save).toHaveBeenCalled();
            expect(result.status).toBe('rejected');
        });

        it('должен выбросить ошибку если не admin', async () => {
            const pendingArticle = { ...mockArticleDoc, status: 'pending' };
            mockArticle.findById.mockReturnValue(createQueryChain(pendingArticle));
            mockUser.findById.mockResolvedValue(mockAuthorUser);

            await expect(articleService.rejectArticle(mockArticleId, mockAuthorId, 'Причина'))
                .rejects.toThrow('Только администратор может отклонять статьи');
        });

        it('должен выбросить ошибку если статья не pending', async () => {
            const publishedArticle = { ...mockArticleDoc, status: 'published' };
            mockArticle.findById.mockReturnValue(createQueryChain(publishedArticle));
            mockUser.findById.mockResolvedValue(mockAdminUser);

            await expect(articleService.rejectArticle(mockArticleId, mockAdminId, 'Причина'))
                .rejects.toThrow('Можно отклонить только статьи на модерации');
        });

        it('должен выбросить ошибку если причина не указана', async () => {
            const pendingArticle = { ...mockArticleDoc, status: 'pending' };
            mockArticle.findById.mockReturnValue(createQueryChain(pendingArticle));
            mockUser.findById.mockResolvedValue(mockAdminUser);

            await expect(articleService.rejectArticle(mockArticleId, mockAdminId, ''))
                .rejects.toThrow('Укажите причину отклонения');
        });

        it('должен выбросить ошибку если причина пустая (только пробелы)', async () => {
            const pendingArticle = { ...mockArticleDoc, status: 'pending' };
            mockArticle.findById.mockReturnValue(createQueryChain(pendingArticle));
            mockUser.findById.mockResolvedValue(mockAdminUser);

            await expect(articleService.rejectArticle(mockArticleId, mockAdminId, '   '))
                .rejects.toThrow('Укажите причину отклонения');
        });
    });

    // ==================== getPublishedArticles ====================
    describe('getPublishedArticles', () => {
        it('должен вернуть опубликованные статьи с пагинацией', async () => {
            const articlesArr = [mockArticleDoc];
            // find().populate().populate().sort().limit().skip()
            mockArticle.find.mockReturnValue(createQueryChain(articlesArr));
            mockArticle.countDocuments.mockResolvedValue(1);

            const res = await articleService.getPublishedArticles({ limit: 10, skip: 0 });

            expect(res).toEqual({
                articles: articlesArr,
                total: 1,
                page: 1,
                totalPages: 1,
            });
            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledTimes(articlesArr.length);
        });

        it('должен использовать дефолтные параметры пагинации', async () => {
            const articlesArr = [mockArticleDoc];
            mockArticle.find.mockReturnValue(createQueryChain(articlesArr));
            mockArticle.countDocuments.mockResolvedValue(1);

            await articleService.getPublishedArticles();

            expect(mockArticle.find).toHaveBeenCalledWith({ status: 'published' });
        });

        it('должен вызвать расшифровку для всех статей', async () => {
            const articlesArr = [mockArticleDoc, { ...mockArticleDoc, _id: 'x2' }];
            mockArticle.find.mockReturnValue(createQueryChain(articlesArr));
            mockArticle.countDocuments.mockResolvedValue(2);

            await articleService.getPublishedArticles();

            expect(mockCryptoService.smartDecrypt).toHaveBeenCalledTimes(2);
        });
    });

    // ==================== getPendingArticles ====================
    describe('getPendingArticles', () => {
        it('должен вернуть все статьи на модерации', async () => {
            const arr = [mockArticleDoc];
            mockArticle.find.mockReturnValue(createQueryChain(arr));

            const result = await articleService.getPendingArticles();

            expect(result).toEqual(arr);
            expect(mockArticle.find).toHaveBeenCalledWith({ status: 'pending' });
        });

        it('должен отсортировать по submittedAt (старые первые)', async () => {
            const arr = [mockArticleDoc];
            const chain = createQueryChain(arr);
            mockArticle.find.mockReturnValue(chain);

            await articleService.getPendingArticles();

            // проверяем, что сортировка была вызвана
            expect(chain.sort).toHaveBeenCalledWith({ submittedAt: 1 });
        });
    });

    // ==================== getPopularArticles ====================
    describe('getPopularArticles', () => {
        it('должен вернуть популярные статьи за указанный период', async () => {
            const arr = [mockArticleDoc];
            mockArticle.find.mockReturnValue(createQueryChain(arr));

            const result = await articleService.getPopularArticles();

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(arr);
        });

        it('должен использовать дефолтные параметры', async () => {
            const arr = [mockArticleDoc];
            const chain = createQueryChain(arr);
            mockArticle.find.mockReturnValue(chain);

            await articleService.getPopularArticles(); // limit=10, days=7 по умолчанию

            // проверим, что сортировка по views убывание применена
            expect(chain.sort).toHaveBeenCalledWith({ views: -1 });
            // и что limit был вызван (значение по умолчанию 10)
            expect(chain.limit).toHaveBeenCalledWith(10);
        });

        it('должен сортировать по views (убывание)', async () => {
            const arr = [mockArticleDoc];
            const chain = createQueryChain(arr);
            mockArticle.find.mockReturnValue(chain);

            await articleService.getPopularArticles();

            expect(chain.sort).toHaveBeenCalledWith({ views: -1 });
        });
    });

    // ==================== incrementViews ====================
    describe('incrementViews', () => {
        it('должен увеличить счетчик просмотров на 1', async () => {
            const updated = { ...mockArticleDoc, views: 6 };
            mockArticle.findByIdAndUpdate.mockResolvedValue(updated);

            const res = await articleService.incrementViews(mockArticleId);

            expect(mockArticle.findByIdAndUpdate).toHaveBeenCalledWith(
                mockArticleId,
                { $inc: { views: 1 } },
                { new: true },
            );
            expect(res.views).toBe(6);
        });

        it('должен корректно обработать ошибку', async () => {
            mockArticle.findByIdAndUpdate.mockRejectedValue(new Error('Database error'));
            await expect(articleService.incrementViews(mockArticleId)).rejects.toThrow();
        });
    });

    // ==================== getStatistics (aggregate) ====================
    describe('getStatistics', () => {
        it('должен вернуть статистику по всем статусам (aggregate)', async () => {
            mockArticle.aggregate.mockResolvedValue([
                { _id: 'published', count: 10, totalViews: 120 },
                { _id: 'pending', count: 5, totalViews: 10 },
                { _id: 'rejected', count: 3, totalViews: 2 },
            ]);

            const result = await articleService.getStatistics();

            expect(result).toEqual({
                published: { count: 10, totalViews: 120 },
                pending: { count: 5, totalViews: 10 },
                rejected: { count: 3, totalViews: 2 },
            });
        });

        it('должен вернуть пустой объект если нет статей', async () => {
            mockArticle.aggregate.mockResolvedValue([]);

            const result = await articleService.getStatistics();

            expect(result).toEqual({});
        });
    });
});
