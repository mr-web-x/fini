const Comment = require('../models/Comment');
const Article = require('../models/Article');
const User = require('../models/User');

class CommentService {

  // ==================== CRUD ОПЕРАЦИИ ====================

  /**
   * Создание комментария
   * @param {Object} commentData - данные комментария
   * @param {string} userId - ID пользователя
   * @returns {Object} - созданный комментарий
   */
  async createComment(commentData, userId) {
    try {
      const { article, content, parentComment } = commentData;

      // Проверяем пользователя
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Проверяем блокировку
      if (user.isBlocked.status) {
        throw new Error('Ваш аккаунт заблокирован. Вы не можете оставлять комментарии');
      }

      // Проверяем существование статьи
      const articleExists = await Article.findById(article);

      if (!articleExists) {
        throw new Error('Статья не найдена');
      }

      // Статья должна быть опубликована
      if (articleExists.status !== 'published') {
        throw new Error('Комментарии можно оставлять только к опубликованным статьям');
      }

      // Если это ответ на комментарий - проверяем его существование
      if (parentComment) {
        const parentExists = await Comment.findById(parentComment);

        if (!parentExists) {
          throw new Error('Родительский комментарий не найден');
        }

        // Родительский комментарий должен быть к той же статье
        if (parentExists.article.toString() !== article) {
          throw new Error('Родительский комментарий принадлежит другой статье');
        }
      }

      // Создаем комментарий
      const comment = await Comment.create({
        article,
        user: userId,
        content: content.trim(),
        parentComment: parentComment || null
      });

      console.log(`Комментарий создан: ${comment._id}`);

      // TODO: отправить email уведомление автору статьи
      // TODO: если это ответ - отправить уведомление автору родительского комментария

      return await this.getCommentById(comment._id);

    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      throw error;
    }
  }

  /**
   * Получение комментария по ID
   * @param {string} commentId - ID комментария
   * @returns {Object} - комментарий
   */
  async getCommentById(commentId) {
    try {
      const comment = await Comment.findById(commentId)
        .populate('user', 'firstName lastName avatar role')
        .populate('parentComment')
        .populate('deletedBy', 'firstName lastName');

      if (!comment) {
        throw new Error('Комментарий не найден');
      }

      return comment;

    } catch (error) {
      console.error('Ошибка получения комментария:', error);
      throw error;
    }
  }

  /**
   * Обновление комментария
   * @param {string} commentId - ID комментария
   * @param {string} newContent - новый текст
   * @param {string} userId - ID пользователя
   * @returns {Object} - обновленный комментарий
   */
  async updateComment(commentId, newContent, userId) {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error('Комментарий не найден');
      }

      // Проверка прав (только автор комментария)
      if (comment.user.toString() !== userId) {
        throw new Error('Вы не можете редактировать чужой комментарий');
      }

      // Нельзя редактировать удаленный комментарий
      if (comment.isDeleted) {
        throw new Error('Удаленный комментарий нельзя редактировать');
      }

      // Обновляем содержимое
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
   * Удаление комментария (мягкое удаление)
   * @param {string} commentId - ID комментария
   * @param {string} userId - ID пользователя
   * @returns {Object} - результат удаления
   */
  async deleteComment(commentId, userId) {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error('Комментарий не найден');
      }

      const user = await User.findById(userId);

      // Проверка прав
      const isAuthor = comment.user.toString() === userId;
      const isAdmin = user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        throw new Error('У вас нет прав на удаление этого комментария');
      }

      // Мягкое удаление
      comment.isDeleted = true;
      comment.deletedBy = userId;
      comment.deletedAt = new Date();

      await comment.save();

      console.log(`Комментарий удален: ${comment._id}`);

      return {
        success: true,
        message: 'Комментарий успешно удален'
      };

    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      throw error;
    }
  }

  // ==================== ПОЛУЧЕНИЕ СПИСКОВ ====================

  /**
   * Получение комментариев к статье
   * @param {string} articleId - ID статьи
   * @param {Object} options - параметры
   * @returns {Array} - массив комментариев
   */
  async getArticleComments(articleId, options = {}) {
    try {
      const {
        includeDeleted = false,
        limit = 50,
        skip = 0
      } = options;

      // Проверяем существование статьи
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('Статья не найдена');
      }

      const filter = { article: articleId };

      // По умолчанию не показываем удаленные
      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      // Получаем только комментарии верхнего уровня (без parentComment)
      filter.parentComment = null;

      const comments = await Comment.find(filter)
        .populate('user', 'firstName lastName avatar role')
        .populate('deletedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      // Для каждого комментария загружаем ответы (threading)
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await this.getCommentReplies(comment._id, includeDeleted);
          return {
            ...comment.toObject(),
            replies
          };
        })
      );

      const total = await Comment.countDocuments(filter);

      return {
        comments: commentsWithReplies,
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
   * Получение ответов на комментарий (threading)
   * @param {string} parentCommentId - ID родительского комментария
   * @param {boolean} includeDeleted - включать удаленные
   * @returns {Array} - массив ответов
   */
  async getCommentReplies(parentCommentId, includeDeleted = false) {
    try {
      const filter = { parentComment: parentCommentId };

      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      const replies = await Comment.find(filter)
        .populate('user', 'firstName lastName avatar role')
        .populate('deletedBy', 'firstName lastName')
        .sort({ createdAt: 1 }); // ответы от старых к новым

      return replies;

    } catch (error) {
      console.error('Ошибка получения ответов на комментарий:', error);
      throw error;
    }
  }

  /**
   * Получение комментариев пользователя
   * @param {string} userId - ID пользователя
   * @param {Object} options - параметры
   * @returns {Array} - массив комментариев
   */
  async getUserComments(userId, options = {}) {
    try {
      const {
        includeDeleted = false,
        limit = 20,
        skip = 0
      } = options;

      const filter = { user: userId };

      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      const comments = await Comment.find(filter)
        .populate('article', 'title slug')
        .populate('user', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Comment.countDocuments(filter);

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
   * @param {Object} options - параметры
   * @returns {Array} - массив комментариев
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

      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      const comments = await Comment.find(filter)
        .populate('article', 'title slug')
        .populate('user', 'firstName lastName email avatar')
        .populate('deletedBy', 'firstName lastName')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);

      const total = await Comment.countDocuments(filter);

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
   * Удаление комментария админом (с причиной)
   * @param {string} commentId - ID комментария
   * @param {string} adminId - ID админа
   * @param {string} reason - причина удаления (опционально)
   * @returns {Object} - результат
   */
  async moderateDeleteComment(commentId, adminId, reason = '') {
    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        throw new Error('Комментарий не найден');
      }

      const admin = await User.findById(adminId);

      if (!admin || admin.role !== 'admin') {
        throw new Error('Только администратор может модерировать комментарии');
      }

      // Мягкое удаление
      comment.isDeleted = true;
      comment.deletedBy = adminId;
      comment.deletedAt = new Date();

      await comment.save();

      console.log(`Комментарий удален админом: ${comment._id}. Причина: ${reason}`);

      // TODO: отправить уведомление автору комментария

      return {
        success: true,
        message: 'Комментарий удален администратором'
      };

    } catch (error) {
      console.error('Ошибка модерации комментария:', error);
      throw error;
    }
  }

  /**
   * Массовое удаление комментариев пользователя (при блокировке)
   * @param {string} userId - ID пользователя
   * @param {string} adminId - ID админа
   * @returns {Object} - результат
   */
  async deleteUserComments(userId, adminId) {
    try {
      const admin = await User.findById(adminId);

      if (!admin || admin.role !== 'admin') {
        throw new Error('Только администратор может выполнять массовое удаление');
      }

      const result = await Comment.updateMany(
        { user: userId, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedBy: adminId,
            deletedAt: new Date()
          }
        }
      );

      console.log(`Удалено комментариев пользователя ${userId}: ${result.modifiedCount}`);

      return {
        success: true,
        deletedCount: result.modifiedCount,
        message: `Удалено комментариев: ${result.modifiedCount}`
      };

    } catch (error) {
      console.error('Ошибка массового удаления комментариев:', error);
      throw error;
    }
  }

  // ==================== СТАТИСТИКА ====================

  /**
   * Получение статистики комментариев
   * @returns {Object} - статистика
   */
  async getStatistics() {
    try {
      const total = await Comment.countDocuments();
      const deleted = await Comment.countDocuments({ isDeleted: true });
      const active = total - deleted;

      // Количество комментариев с ответами
      const withReplies = await Comment.countDocuments({
        parentComment: { $ne: null }
      });

      // Топ-авторы комментариев
      const topCommenters = await Comment.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$user',
            count: { $sum: 1 }
          }
        },
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

      return {
        total,
        active,
        deleted,
        replies: withReplies,
        topCommenters
      };

    } catch (error) {
      console.error('Ошибка получения статистики комментариев:', error);
      throw error;
    }
  }

  /**
   * Количество комментариев к статье
   * @param {string} articleId - ID статьи
   * @returns {number} - количество
   */
  async getArticleCommentsCount(articleId) {
    try {
      const count = await Comment.countDocuments({
        article: articleId,
        isDeleted: false
      });

      return count;

    } catch (error) {
      console.error('Ошибка подсчета комментариев:', error);
      throw error;
    }
  }

  /**
   * Количество комментариев пользователя
   * @param {string} userId - ID пользователя
   * @returns {number} - количество
   */
  async getUserCommentsCount(userId) {
    try {
      const count = await Comment.countDocuments({
        user: userId,
        isDeleted: false
      });

      return count;

    } catch (error) {
      console.error('Ошибка подсчета комментариев пользователя:', error);
      throw error;
    }
  }
}

module.exports = new CommentService();