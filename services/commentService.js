import CommentModel from '../models/Comment.model.js';
import ArticleModel from '../models/Article.model.js';
import UserModel from '../models/User.model.js';
import cryptoService from './cryptoService.js';

class CommentService {
  // ==================== CRUD ОПЕРАЦИИ ====================

  /**
   * Создание комментария
   */
  async createComment(commentData, userId) {
    try {
      const { article, content } = commentData;

      // Проверяем пользователя
      const user = await UserModel.findById(userId);
      if (!user) throw new Error('Пользователь не найден');

      if (user.isBlocked?.status) {
        throw new Error('Ваш аккаунт заблокирован. Вы не можете оставлять комментарии');
      }

      // Проверяем существование статьи
      const articleExists = await ArticleModel.findById(article);
      if (!articleExists) throw new Error('Статья не найдена');

      if (articleExists.status !== 'published') {
        throw new Error('Комментарии можно оставлять только к опубликованным статьям');
      }

      // Создаём комментарий
      const comment = await CommentModel.create({
        article,
        user: userId,
        content: content.trim()
      });

      console.log(`Комментарий создан: ${comment._id}`);
      return await this.getCommentById(comment._id);

    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      throw error;
    }
  }

  /**
   * Получение комментария по ID
   */
  async getCommentById(commentId) {
    try {
      const comment = await CommentModel.findById(commentId)
        .populate('user', 'firstName lastName avatar role')
        .populate('deletedBy', 'firstName lastName');

      if (!comment) throw new Error('Комментарий не найден');

      // Расшифровываем пользователя и deletedBy
      await cryptoService.smartDecrypt(comment);

      return comment;

    } catch (error) {
      console.error('Ошибка получения комментария:', error);
      throw error;
    }
  }

  /**
   * Обновление комментария
   */
  async updateComment(commentId, newContent, userId) {
    try {
      const comment = await CommentModel.findById(commentId);
      if (!comment) throw new Error('Комментарий не найден');

      if (comment.user.toString() !== userId.toString()) {
        throw new Error('Вы не можете редактировать чужой комментарий');
      }

      if (comment.isDeleted) {
        throw new Error('Удаленный комментарий нельзя редактировать');
      }

      comment.content = newContent.trim();
      await comment.save();

      console.log(`Комментарий обновлен: ${comment._id}`);
      return await this.getCommentById(comment._id);

    } catch (error) {
      console.error('Ошибка обновления комментария:', error);
      throw error;
    }
  }

  /**
   * Удаление комментария (мягкое)
   */
  async deleteComment(commentId, userId) {
    try {
      const comment = await CommentModel.findById(commentId);
      if (!comment) throw new Error('Комментарий не найден');

      const user = await UserModel.findById(userId);
      if (!user) throw new Error('Пользователь не найден');

      const isAuthor = comment.user.toString() === userId.toString();
      const isAdmin = user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        throw new Error('У вас нет прав на удаление этого комментария');
      }

      comment.isDeleted = true;
      comment.deletedBy = userId;
      comment.deletedAt = new Date();
      await comment.save();

      console.log(`Комментарий удален: ${comment._id}`);
      return { success: true, message: 'Комментарий успешно удален' };

    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      throw error;
    }
  }

  // ==================== ПОЛУЧЕНИЕ СПИСКОВ ====================

  /**
   * Получение комментариев к статье
   */
  async getArticleComments(articleId, options = {}) {
    try {
      const { includeDeleted = false, limit = 50, skip = 0 } = options;

      const article = await ArticleModel.findById(articleId);
      if (!article) throw new Error('Статья не найдена');

      const filter = { article: articleId };
      if (!includeDeleted) filter.isDeleted = false;

      const comments = await CommentModel.find(filter)
        .populate('user', 'firstName lastName avatar role')
        .populate('deletedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      // Расшифровываем массив комментариев
      await Promise.all(
        comments.map(comment => cryptoService.smartDecrypt(comment))
      );

      const total = await CommentModel.countDocuments(filter);
      return {
        comments,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Ошибка получения комментариев статьи:', error);
      throw error;
    }
  }

  /**
   * Получение комментариев пользователя
   */
  async getUserComments(userId, options = {}) {
    try {
      const { includeDeleted = false, limit = 20, skip = 0 } = options;

      const filter = { user: userId };
      if (!includeDeleted) filter.isDeleted = false;

      const comments = await CommentModel.find(filter)
        .populate('article', 'title slug')
        .populate('user', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      // Расшифровываем массив комментариев
      await Promise.all(
        comments.map(comment => cryptoService.smartDecrypt(comment))
      );

      const total = await CommentModel.countDocuments(filter);
      return {
        comments,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Ошибка получения комментариев пользователя:', error);
      throw error;
    }
  }

  /**
   * Получение всех комментариев (для админа)
   */
  async getAllComments(options = {}) {
    try {
      const {
        includeDeleted = true,
        limit = 50,
        skip = 0,
        sortBy = 'createdAt',
        sortOrder = -1
      } = options;

      const filter = {};
      if (!includeDeleted) filter.isDeleted = false;

      const comments = await CommentModel.find(filter)
        .populate('article', 'title slug')
        .populate('user', 'firstName lastName email avatar')
        .populate('deletedBy', 'firstName lastName')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);

      // Расшифровываем массив комментариев
      await Promise.all(
        comments.map(comment => cryptoService.smartDecrypt(comment))
      );

      const total = await CommentModel.countDocuments(filter);
      return {
        comments,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Ошибка получения всех комментариев:', error);
      throw error;
    }
  }

  // ==================== МОДЕРАЦИЯ ====================

  /**
   * Удаление комментария админом
   */
  async moderateDeleteComment(commentId, adminId, reason) {
    try {
      const comment = await CommentModel.findById(commentId);
      if (!comment) throw new Error('Комментарий не найден');

      const admin = await UserModel.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        throw new Error('Только администратор может модерировать комментарии');
      }

      comment.isDeleted = true;
      comment.deletedBy = adminId;
      comment.deletedAt = new Date();
      await comment.save();

      const deleteReason = reason || 'не указана';
      console.log(`Комментарий удален админом: ${comment._id}. Причина: ${deleteReason}`);

      return { success: true, message: 'Комментарий удален администратором' };

    } catch (error) {
      console.error('Ошибка модерации комментария:', error);
      throw error;
    }
  }

  // ==================== СТАТИСТИКА ====================

  /**
   * Получение статистики по комментариям
   */
  async getStatistics() {
    try {
      const total = await CommentModel.countDocuments();
      const active = await CommentModel.countDocuments({ isDeleted: false });
      const deleted = await CommentModel.countDocuments({ isDeleted: true });

      // Топ комментаторов
      const topCommenters = await CommentModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            count: 1,
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            avatar: '$user.avatar'
          }
        }
      ]);

      // Расшифровываем данные топ комментаторов
      for (const commenter of topCommenters) {
        if (commenter.firstName) {
          try {
            commenter.firstName = await cryptoService.decryptData(commenter.firstName);
          } catch (error) {
            console.warn('Не удалось расшифровать firstName:', error.message);
          }
        }
        if (commenter.lastName) {
          try {
            commenter.lastName = await cryptoService.decryptData(commenter.lastName);
          } catch (error) {
            console.warn('Не удалось расшифровать lastName:', error.message);
          }
        }
      }

      return {
        total,
        active,
        deleted,
        topCommenters
      };

    } catch (error) {
      console.error('Ошибка получения статистики комментариев:', error);
      throw error;
    }
  }

  /**
   * Подсчет комментариев к статье
   */
  async getArticleCommentsCount(articleId) {
    try {
      return await CommentModel.countDocuments({ article: articleId, isDeleted: false });
    } catch (error) {
      console.error('Ошибка подсчета комментариев:', error);
      throw error;
    }
  }

  /**
   * Подсчет комментариев пользователя
   */
  async getUserCommentsCount(userId) {
    try {
      return await CommentModel.countDocuments({ user: userId, isDeleted: false });
    } catch (error) {
      console.error('Ошибка подсчета комментариев пользователя:', error);
      throw error;
    }
  }
}

export default new CommentService();