// tests/unit/services/commentService.test.js
import { jest } from '@jest/globals';

// ---------- Модули-моки (ручные), объявляем ДО импорта SUT ----------
const CommentModelMock = {
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

const ArticleModelMock = {
  findById: jest.fn(),
};

const UserModelMock = {
  findById: jest.fn(),
};

const cryptoServiceMock = {
  smartDecrypt: jest.fn(),
  decryptData: jest.fn(),
};

// Регистрируем модули как ESM-моки
await jest.unstable_mockModule('../../../models/Comment.model.js', () => ({
  default: CommentModelMock,
}));
await jest.unstable_mockModule('../../../models/Article.model.js', () => ({
  default: ArticleModelMock,
}));
await jest.unstable_mockModule('../../../models/User.model.js', () => ({
  default: UserModelMock,
}));
await jest.unstable_mockModule('../../../services/cryptoService.js', () => ({
  default: cryptoServiceMock,
}));

// Теперь импортируем SUT (instance) после моков
const { default: CommentService } = await import('../../../services/commentService.js');

// ---------- Утилиты для построения цепочек (chain mocks) ----------
// thenable-хелпер: чтобы await на query без .exec() возвращал нужный результат
const makeThenable = (obj, value) =>
  Object.assign(obj, { then: (resolve) => resolve(value) });

// Цепочка для find(): populate → populate → populate → sort → limit → skip → Promise(result)
const buildFindChain = (result) => {
  const chain = {
    populate: jest.fn().mockReturnThis(), // можно вызывать много раз
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockResolvedValue(result), // последним вернёт Promise
  };
  // На всякий случай делаем thenable — вдруг где-то будет await без skip()
  return makeThenable(chain, result);
};

// Цепочка для findById(): populate → populate → await на всей цепочке => result
const buildFindByIdChain = (result) => {
  const chain = {
    populate: jest.fn().mockReturnThis(), // можно вызывать много раз
  };
  return makeThenable(chain, result);
};

// ---------- Тестовые данные ----------
const mockUserId = '507f1f77bcf86cd799439011';
const mockAdminId = '507f1f77bcf86cd799439022';
const mockArticleId = '507f1f77bcf86cd799439033';
const mockCommentId = '507f1f77bcf86cd799439025';

const mockUser = { _id: mockUserId, role: 'user', isBlocked: { status: false } };
const mockAdmin = { _id: mockAdminId, role: 'admin' };
const mockArticle = { _id: mockArticleId, status: 'published' };

const mockComment = {
  _id: mockCommentId,
  article: mockArticleId,
  user: mockUserId,
  content: 'text',
  isDeleted: false,
  save: jest.fn().mockResolvedValue(true),
};

// ---------- Настройки перед каждым тестом ----------
beforeEach(() => {
  jest.clearAllMocks();

  // Значения по умолчанию для криптосервиса
  cryptoServiceMock.smartDecrypt.mockResolvedValue(undefined);
  cryptoServiceMock.decryptData.mockResolvedValue('decrypted');
});

// ========================= ТЕСТЫ =========================
describe('CommentService (CLEAN)', () => {
  // ---------- CREATE ----------
  describe('createComment', () => {
    it('создаёт комментарий при валидных данных', async () => {
      UserModelMock.findById.mockResolvedValue(mockUser);
      ArticleModelMock.findById.mockResolvedValue(mockArticle);
      CommentModelMock.create.mockResolvedValue(mockComment);
      CommentModelMock.findById.mockReturnValue(buildFindByIdChain(mockComment));

      const result = await CommentService.createComment(
        { article: mockArticleId, content: ' hi ' },
        mockUserId
      );
      expect(result._id).toBe(mockCommentId);
    });

    it('ошибка: пользователь не найден', async () => {
      UserModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.createComment({ article: mockArticleId, content: 'x' }, mockUserId)
      ).rejects.toThrow('Пользователь не найден');
    });

    it('ошибка: пользователь заблокирован', async () => {
      UserModelMock.findById.mockResolvedValue({ ...mockUser, isBlocked: { status: true } });
      await expect(
        CommentService.createComment({ article: mockArticleId, content: 'x' }, mockUserId)
      ).rejects.toThrow('Ваш аккаунт заблокирован. Вы не можете оставлять комментарии');
    });

    it('ошибка: статья не найдена', async () => {
      UserModelMock.findById.mockResolvedValue(mockUser);
      ArticleModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.createComment({ article: mockArticleId, content: 'x' }, mockUserId)
      ).rejects.toThrow('Статья не найдена');
    });

    it('ошибка: статья не опубликована', async () => {
      UserModelMock.findById.mockResolvedValue(mockUser);
      ArticleModelMock.findById.mockResolvedValue({ ...mockArticle, status: 'draft' });
      await expect(
        CommentService.createComment({ article: mockArticleId, content: 'x' }, mockUserId)
      ).rejects.toThrow('Комментарии можно оставлять только к опубликованным статьям');
    });
  });

  // ---------- GET BY ID ----------
  describe('getCommentById', () => {
    it('возвращает комментарий и вызывает smartDecrypt', async () => {
      CommentModelMock.findById.mockReturnValue(buildFindByIdChain(mockComment));
      const result = await CommentService.getCommentById(mockCommentId);
      expect(result._id).toBe(mockCommentId);
      expect(cryptoServiceMock.smartDecrypt).toHaveBeenCalledTimes(1);
    });

    it('ошибка: комментарий не найден', async () => {
      CommentModelMock.findById.mockReturnValue(buildFindByIdChain(null));
      await expect(CommentService.getCommentById(mockCommentId)).rejects.toThrow(
        'Комментарий не найден'
      );
    });
  });

  // ---------- UPDATE ----------
  describe('updateComment', () => {
    it('автор обновляет свой не удалённый комментарий', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      CommentModelMock.findById.mockReturnValue(buildFindByIdChain(mockComment));

      const result = await CommentService.updateComment(mockCommentId, 'new text', mockUserId);
      expect(result._id).toBe(mockCommentId);
    });

    it('ошибка: не владелец', async () => {
      CommentModelMock.findById.mockResolvedValue({ ...mockComment, user: 'other' });
      await expect(
        CommentService.updateComment(mockCommentId, 'new text', mockUserId)
      ).rejects.toThrow('Вы не можете редактировать чужой комментарий');
    });

    it('ошибка: удалённый комментарий', async () => {
      CommentModelMock.findById.mockResolvedValue({ ...mockComment, isDeleted: true });
      await expect(
        CommentService.updateComment(mockCommentId, 'new text', mockUserId)
      ).rejects.toThrow('Удаленный комментарий нельзя редактировать');
    });

    it('ошибка: комментарий не найден', async () => {
      CommentModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.updateComment(mockCommentId, 'new text', mockUserId)
      ).rejects.toThrow('Комментарий не найден');
    });
  });

  // ---------- DELETE (soft) ----------
  describe('deleteComment', () => {
    it('автор может удалить свой комментарий', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      UserModelMock.findById.mockResolvedValue(mockUser);

      const result = await CommentService.deleteComment(mockCommentId, mockUserId);
      expect(result.success).toBe(true);
    });

    it('админ может удалить любой комментарий', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      UserModelMock.findById.mockResolvedValue(mockAdmin);

      const result = await CommentService.deleteComment(mockCommentId, mockAdminId);
      expect(result.success).toBe(true);
    });

    it('ошибка: нет прав', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      UserModelMock.findById.mockResolvedValue({ ...mockUser, _id: 'someone-else' });

      await expect(
        CommentService.deleteComment(mockCommentId, 'someone-else')
      ).rejects.toThrow('У вас нет прав на удаление этого комментария');
    });

    it('ошибка: комментарий не найден', async () => {
      CommentModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.deleteComment(mockCommentId, mockUserId)
      ).rejects.toThrow('Комментарий не найден');
    });

    it('ошибка: пользователь не найден', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      UserModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.deleteComment(mockCommentId, mockUserId)
      ).rejects.toThrow('Пользователь не найден');
    });
  });

  // ---------- GET ARTICLE COMMENTS ----------
  describe('getArticleComments', () => {
    it('возвращает список с пагинацией и расшифровкой', async () => {
      ArticleModelMock.findById.mockResolvedValue(mockArticle);
      CommentModelMock.find.mockReturnValue(buildFindChain([mockComment]));
      CommentModelMock.countDocuments.mockResolvedValue(1);

      const result = await CommentService.getArticleComments(mockArticleId);
      expect(result.total).toBe(1);
      expect(Array.isArray(result.comments)).toBe(true);
      expect(cryptoServiceMock.smartDecrypt).toHaveBeenCalledTimes(1);
    });

    it('includeDeleted=true — не фильтруем по isDeleted', async () => {
      ArticleModelMock.findById.mockResolvedValue(mockArticle);
      CommentModelMock.find.mockReturnValue(buildFindChain([mockComment]));
      CommentModelMock.countDocuments.mockResolvedValue(1);

      const result = await CommentService.getArticleComments(mockArticleId, { includeDeleted: true });
      expect(result.total).toBe(1);
    });

    it('ошибка: статья не найдена', async () => {
      ArticleModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.getArticleComments(mockArticleId)
      ).rejects.toThrow('Статья не найдена');
    });
  });

  // ---------- GET USER COMMENTS ----------
  describe('getUserComments', () => {
    it('возвращает список с сортировкой/пагинацией', async () => {
      CommentModelMock.find.mockReturnValue(buildFindChain([mockComment]));
      CommentModelMock.countDocuments.mockResolvedValue(1);

      const result = await CommentService.getUserComments(mockUserId);
      expect(result.total).toBe(1);
      expect(Array.isArray(result.comments)).toBe(true);
    });

    it('includeDeleted=true — возвращает и удалённые', async () => {
      CommentModelMock.find.mockReturnValue(buildFindChain([mockComment]));
      CommentModelMock.countDocuments.mockResolvedValue(1);

      const result = await CommentService.getUserComments(mockUserId, { includeDeleted: true });
      expect(result.total).toBe(1);
    });
  });

  // ---------- GET ALL COMMENTS (admin) ----------
  describe('getAllComments', () => {
    it('по умолчанию includeDeleted=true', async () => {
      CommentModelMock.find.mockReturnValue(buildFindChain([mockComment]));
      CommentModelMock.countDocuments.mockResolvedValue(1);

      const result = await CommentService.getAllComments();
      expect(result.total).toBe(1);
      expect(Array.isArray(result.comments)).toBe(true);
    });

    it('includeDeleted=false — фильтруем по isDeleted:false', async () => {
      CommentModelMock.find.mockReturnValue(buildFindChain([mockComment]));
      CommentModelMock.countDocuments.mockResolvedValue(1);

      const result = await CommentService.getAllComments({ includeDeleted: false });
      expect(result.total).toBe(1);
    });
  });

  // ---------- MODERATE DELETE ----------
  describe('moderateDeleteComment', () => {
    it('админ может удалить комментарий', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      UserModelMock.findById.mockResolvedValue(mockAdmin);

      const result = await CommentService.moderateDeleteComment(
        mockCommentId,
        mockAdminId,
        'spam'
      );
      expect(result.success).toBe(true);
    });

    it('ошибка: не админ', async () => {
      CommentModelMock.findById.mockResolvedValue(mockComment);
      UserModelMock.findById.mockResolvedValue(mockUser);

      await expect(
        CommentService.moderateDeleteComment(mockCommentId, mockUserId, 'spam')
      ).rejects.toThrow('Только администратор может модерировать комментарии');
    });

    it('ошибка: комментарий не найден', async () => {
      CommentModelMock.findById.mockResolvedValue(null);
      await expect(
        CommentService.moderateDeleteComment(mockCommentId, mockAdminId, 'spam')
      ).rejects.toThrow('Комментарий не найден');
    });
  });

  // ---------- STATISTICS ----------
  describe('getStatistics', () => {
    it('возвращает total/active/deleted и topCommenters', async () => {
      CommentModelMock.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2); // deleted

      CommentModelMock.aggregate.mockResolvedValue([
        { userId: mockUserId, count: 5, firstName: 'encA', lastName: 'encB', avatar: 'a.png' },
      ]);

      const result = await CommentService.getStatistics();
      expect(result.total).toBe(10);
      expect(result.active).toBe(8);
      expect(result.deleted).toBe(2);
      expect(result.topCommenters.length).toBe(1);
    });

    it('пустой список топ-комментаторов', async () => {
      CommentModelMock.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      CommentModelMock.aggregate.mockResolvedValue([]);

      const result = await CommentService.getStatistics();
      expect(result.topCommenters.length).toBe(0);
    });
  });

  // ---------- COUNTS ----------
  describe('counts', () => {
    it('getArticleCommentsCount возвращает число', async () => {
      CommentModelMock.countDocuments.mockResolvedValue(5);
      const result = await CommentService.getArticleCommentsCount(mockArticleId);
      expect(result).toBe(5);
    });

    it('getUserCommentsCount возвращает число', async () => {
      CommentModelMock.countDocuments.mockResolvedValue(3);
      const result = await CommentService.getUserCommentsCount(mockUserId);
      expect(result).toBe(3);
    });
  });
});
