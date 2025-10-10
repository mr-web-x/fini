import Article from "../models/Article.model.js"
import User from "../models/User.model.js"
import Category from "../models/Category.model.js"
import { writeLog } from "../middlewares/logger.js";

class ArticleService {

  // ==================== CRUD ОПЕРАЦИИ ====================

  /**
   * Создание новой статьи (draft)
   * @param {Object} articleData - данные статьи
   * @param {string} authorId - ID автора
   * @returns {Object} - созданная статья
   */
  async createArticle(articleData, authorId) {
    try {
      // Проверяем, что автор существует и имеет права
      const author = await User.findById(authorId);

      // writeLog("INFO", "")

      if (!author) {
        throw new Error('Автор не найден');
      }

      if (author.role !== 'author' && author.role !== 'admin') {
        throw new Error('У вас нет прав на создание статей');
      }

      // Проверяем блокировку
      if (author.isBlocked.status) {
        throw new Error('Ваш аккаунт заблокирован');
      }

      // Проверяем категорию
      const category = await Category.findById(articleData.category);
      if (!category) {
        throw new Error('Категория не найдена');
      }

      // Проверяем уникальность slug
      const existingArticle = await Article.findOne({ slug: articleData.slug });
      if (existingArticle) {
        throw new Error('Статья с таким slug уже существует');
      }

      // Создаем статью со статусом draft
      const article = await Article.create({
        ...articleData,
        author: authorId,
        status: 'draft'
      });

      console.log(`Статья создана: ${article.title} (${article.slug})`);

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('Ошибка создания статьи:', error);
      throw error;
    }
  }

  /**
   * Получение статьи по ID
   * @param {string} articleId - ID статьи
   * @param {boolean} populate - загружать ли связанные данные
   * @returns {Object} - статья
   */
  async getArticleById(articleId, populate = true) {
    const article = await Article.findById(articleId)
      .populate('author', 'firstName lastName email avatar bio position role')
      .populate('category', 'name slug description');

    if (!article) {
      throw new Error('Статья не найдена');
    }

    // ✅ Расшифровываем автора
    await cryptoService.smartDecrypt(article);

    return article;
  }

  /**
   * Получение статьи по slug
   * @param {string} slug - slug статьи
   * @returns {Object} - статья
   */
  async getArticleBySlug(slug) {
    try {
      const article = await Article.findOne({ slug })
        .populate('author', 'firstName lastName email avatar bio position role')
        .populate('category', 'name slug description');

      if (!article) {
        throw new Error('Статья не найдена');
      }

      return article;

    } catch (error) {
      console.error('Ошибка получения статьи по slug:', error);
      throw error;
    }
  }

  /**
   * Обновление статьи
   * @param {string} articleId - ID статьи
   * @param {Object} updateData - данные для обновления
   * @param {string} userId - ID пользователя (для проверки прав)
   * @returns {Object} - обновленная статья
   */
  async updateArticle(articleId, updateData, userId) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('Статья не найдена');
      }

      // КРИТИЧНО: нельзя редактировать published статьи
      if (article.status === 'published') {
        throw new Error('Опубликованные статьи нельзя редактировать');
      }

      const user = await User.findById(userId);

      // Проверка прав
      const isAuthor = article.author.toString() === userId;
      const isAdmin = user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        throw new Error('У вас нет прав на редактирование этой статьи');
      }

      // Статью на модерации (pending) может редактировать только админ
      if (article.status === 'pending' && !isAdmin) {
        throw new Error('Статья на модерации. Дождитесь решения администратора.');
      }

      // Проверяем slug на уникальность (если меняется)
      if (updateData.slug && updateData.slug !== article.slug) {
        const existingArticle = await Article.findOne({
          slug: updateData.slug,
          _id: { $ne: articleId }
        });

        if (existingArticle) {
          throw new Error('Статья с таким slug уже существует');
        }
      }

      // Обновляем разрешенные поля
      const allowedFields = [
        'title', 'slug', 'excerpt', 'content', 'category',
        'tags', 'seo'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          article[field] = updateData[field];
        }
      });

      await article.save();

      console.log(`Статья обновлена: ${article.title}`);

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('Ошибка обновления статьи:', error);
      throw error;
    }
  }

  /**
   * Удаление статьи
   * @param {string} articleId - ID статьи
   * @param {string} userId - ID пользователя
   * @returns {Object} - результат удаления
   */
  async deleteArticle(articleId, userId) {
    try {
      // ✅ 1. Находим статью
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('Статья не найдена');
      }

      // ✅ 2. Находим пользователя
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('Пользователь не найден'); // ← исправлено сообщение
      }

      // ✅ 3. ДОБАВЛЕНО: Логирование для отладки
      console.log('[DELETE] Проверка прав:', {
        articleId,
        articleStatus: article.status,
        articleAuthor: article.author.toString(),
        userId,
        userRole: user.role,
        isAuthor: article.author.toString() === userId,
        isAdmin: user.role === 'admin'
      });

      // ✅ 4. Определяем права
      const isAuthor = article.author.toString() === userId;
      const isAdmin = user.role === 'admin';

      // ✅ 5. УПРОЩЕННАЯ ЛОГИКА: Проверка прав в зависимости от статуса
      if (article.status === 'published') {
        // Опубликованную статью может удалить ТОЛЬКО админ
        if (!isAdmin) {
          throw new Error('Опубликованные статьи может удалять только администратор');
        }
      } else {
        // draft/pending/rejected может удалить автор ИЛИ админ
        if (!isAuthor && !isAdmin) {
          throw new Error('У вас нет прав на удаление этой статьи');
        }
      }

      // ✅ 6. Удаляем статью
      await Article.findByIdAndDelete(articleId);

      console.log(`✅ Статья удалена: ${article.title} (статус: ${article.status})`);

      return {
        success: true,
        message: 'Статья успешно удалена'
      };

    } catch (error) {
      console.error('❌ Ошибка удаления статьи:', error.message);
      throw error;
    }
  }

  // ==================== WORKFLOW СТАТУСОВ ====================

  /**
   * Отправка статьи на модерацию (draft → pending)
   * @param {string} articleId - ID статьи
   * @param {string} userId - ID автора
   * @returns {Object} - обновленная статья
   */
  async submitForReview(articleId, userId) {
    try {
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('Статья не найдена');
      }

      // Проверка прав (только автор статьи)
      if (article.author.toString() !== userId) {
        throw new Error('Вы не являетесь автором этой статьи');
      }

      // Можно отправить только draft или rejected
      if (article.status !== 'draft' && article.status !== 'rejected') {
        throw new Error(`Статья в статусе "${article.status}" не может быть отправлена на модерацию`);
      }

      // Меняем статус
      article.status = 'pending';
      article.submittedAt = new Date();

      // Очищаем данные об отклонении
      article.rejectionReason = '';
      article.rejectedBy = null;
      article.rejectedAt = null;

      await article.save();

      console.log(`Статья отправлена на модерацию: ${article.title}`);

      // TODO: отправить email уведомление админу

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('Ошибка отправки на модерацию:', error);
      throw error;
    }
  }

  /**
   * Одобрение статьи админом (pending → published)
   * @param {string} articleId - ID статьи
   * @param {string} adminId - ID админа
   * @returns {Object} - опубликованная статья
   */
  async approveArticle(articleId, adminId) {
    try {
      const article = await Article.findById(articleId).populate('author');

      if (!article) {
        throw new Error('Статья не найдена');
      }

      const admin = await User.findById(adminId);

      if (!admin || admin.role !== 'admin') {
        throw new Error('Только администратор может одобрять статьи');
      }

      if (article.status !== 'pending') {
        throw new Error('Можно одобрить только статьи на модерации');
      }

      // Публикуем статью
      article.status = 'published';
      article.publishedAt = new Date();

      // Очищаем данные об отклонении
      article.rejectionReason = '';
      article.rejectedBy = null;
      article.rejectedAt = null;

      await article.save();

      console.log(`Статья одобрена: ${article.title}`);

      // TODO: отправить email уведомление автору

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('Ошибка одобрения статьи:', error);
      throw error;
    }
  }

  /**
   * Отклонение статьи админом (pending → rejected)
   * @param {string} articleId - ID статьи
   * @param {string} adminId - ID админа
   * @param {string} reason - причина отклонения
   * @returns {Object} - отклоненная статья
   */
  async rejectArticle(articleId, adminId, reason) {
    try {
      const article = await Article.findById(articleId).populate('author');

      if (!article) {
        throw new Error('Статья не найдена');
      }

      const admin = await User.findById(adminId);

      if (!admin || admin.role !== 'admin') {
        throw new Error('Только администратор может отклонять статьи');
      }

      if (article.status !== 'pending') {
        throw new Error('Можно отклонить только статьи на модерации');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Укажите причину отклонения');
      }

      // Отклоняем статью
      article.status = 'rejected';
      article.rejectionReason = reason;
      article.rejectedBy = adminId;
      article.rejectedAt = new Date();

      await article.save();

      console.log(`Статья отклонена: ${article.title}. Причина: ${reason}`);

      // TODO: отправить email уведомление автору

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('Ошибка отклонения статьи:', error);
      throw error;
    }
  }

  // ==================== ПОЛУЧЕНИЕ СПИСКОВ ====================

  /**
   * Получение всех опубликованных статей
   * @param {Object} options - параметры (limit, skip, sort)
   * @returns {Array} - массив статей
   */
  async getPublishedArticles(options = {}) {
    try {
      const {
        limit = 20,
        skip = 0,
        sortBy = 'publishedAt',
        sortOrder = -1
      } = options;

      const articles = await Article.find({ status: 'published' })
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);

      const total = await Article.countDocuments({ status: 'published' });

      return {
        articles,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Ошибка получения опубликованных статей:', error);
      throw error;
    }
  }

  /**
   * Получение статей в категории
   * @param {string} categoryId - ID категории
   * @param {Object} options - параметры
   * @returns {Array} - массив статей
   */
  async getArticlesByCategory(categoryId, options = {}) {
    try {
      const {
        limit = 20,
        skip = 0,
        sortBy = 'publishedAt',
        sortOrder = -1
      } = options;

      const articles = await Article.find({
        status: 'published',
        category: categoryId
      })
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);

      const total = await Article.countDocuments({
        status: 'published',
        category: categoryId
      });

      return {
        articles,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Ошибка получения статей категории:', error);
      throw error;
    }
  }

  /**
   * Получение статей автора
   * @param {string} authorId - ID автора
   * @param {Object} options - параметры
   * @returns {Array} - массив статей
   */
  async getArticlesByAuthor(authorId, options = {}) {
    try {
      const {
        limit = 20,
        skip = 0,
        status = null // null = все статусы
      } = options;

      const filter = { author: authorId };
      if (status) filter.status = status;

      const articles = await Article.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Article.countDocuments(filter);

      return {
        articles,
        total,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      console.error('Ошибка получения статей автора:', error);
      throw error;
    }
  }

  /**
   * Получение статей на модерации (для админа)
   * @returns {Array} - массив статей
   */
  async getPendingArticles() {
    try {
      const articles = await Article.find({ status: 'pending' })
        .populate('author', 'firstName lastName email avatar')
        .populate('category', 'name slug')
        .sort({ submittedAt: 1 }); // сначала старые

      return articles;

    } catch (error) {
      console.error('Ошибка получения статей на модерации:', error);
      throw error;
    }
  }

  /**
   * Популярные статьи (по просмотрам)
   * @param {number} limit - количество
   * @param {number} days - за сколько дней
   * @returns {Array} - массив статей
   */
  async getPopularArticles(limit = 10, days = 7) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const articles = await Article.find({
        status: 'published',
        publishedAt: { $gte: dateFrom }
      })
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug')
        .sort({ views: -1 })
        .limit(limit);

      return articles;

    } catch (error) {
      console.error('Ошибка получения популярных статей:', error);
      throw error;
    }
  }

  /**
   * Поиск статей (полнотекстовый)
   * @param {string} searchTerm - поисковый запрос
   * @param {Object} options - параметры
   * @returns {Array} - массив статей
   */
  async searchArticles(searchTerm, options = {}) {
    try {
      const { limit = 20, skip = 0 } = options;

      const articles = await Article.find({
        $text: { $search: searchTerm },
        status: 'published'
      })
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug')
        .limit(limit)
        .skip(skip);

      return articles;

    } catch (error) {
      console.error('Ошибка поиска статей:', error);
      throw error;
    }
  }

  // ==================== СТАТИСТИКА ====================

  /**
   * Увеличение счетчика просмотров
   * @param {string} articleId - ID статьи
   * @returns {Object} - обновленная статья
   */
  async incrementViews(articleId) {
    try {
      const article = await Article.findByIdAndUpdate(
        articleId,
        { $inc: { views: 1 } },
        { new: true }
      );

      return article;

    } catch (error) {
      console.error('Ошибка увеличения просмотров:', error);
      throw error;
    }
  }

  /**
   * Получение статистики статей
   * @returns {Object} - статистика
   */
  async getStatistics() {
    try {
      const stats = await Article.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalViews: { $sum: '$views' }
          }
        }
      ]);

      const result = stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalViews: stat.totalViews
        };
        return acc;
      }, {});

      return result;

    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      throw error;
    }
  }
}

export default new ArticleService()