import Article from "../models/Article.model.js";
import User from "../models/User.model.js";
import Category from "../models/Category.model.js";
import { writeLog } from "../middlewares/logger.js";
import cryptoService from "./cryptoService.js";
import mongoose from 'mongoose';

import generateSlug from "../utils/slugGenerator.js";// new




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

      // ✅ Генерация slug, если не передан
      let slug = articleData.slug;
      if (!slug || slug.trim() === '') {
        slug = generateSlug(articleData.title);
      }

      // ✅ Проверка уникальности slug с добавлением суффикса
      let uniqueSlug = slug;
      let counter = 1;

      // Проверяем, существует ли уже статья с таким slug
      while (await Article.findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      // Создаем статью со статусом draft
      const article = await Article.create({
        ...articleData,
        slug: uniqueSlug, // ✅ Используем уникальный сгенерированный slug
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
    try {
      const article = await Article.findById(articleId)
        .populate('author', 'firstName lastName email avatar bio position role slug') // ✅ ДОБАВЛЕНО: slug
        .populate('category', 'name slug description');

      if (!article) {
        throw new Error('Статья не найдена');
      }

      // ✅ Расшифровываем статью
      await cryptoService.smartDecrypt(article);

      return article;

    } catch (error) {
      console.error('Ошибка получения статьи:', error);
      throw error;
    }
  }

  /**
   * Получение статьи по slug
   * @param {string} slug - slug статьи
   * @returns {Object} - статья
   */
 async getArticleBySlug(slug) {
    try {
      const article = await Article.findOne({ slug })
        .populate('author', 'firstName lastName email avatar bio position role slug') // ✅ ДОБАВЛЕНО: slug
        .populate('category', 'name slug description');

      if (!article) {
        throw new Error('Статья не найдена');
      }

      // ✅ Расшифровываем статью
      await cryptoService.smartDecrypt(article);

      return article;

    } catch (error) {
      console.error('Ошибка получения статьи:', error);
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
      // ✅ ДОБАВЬ ЛОГИРОВАНИЕ В НАЧАЛЕ:
      console.log('🔴 [Backend Service] updateArticle:', {
        articleId,
        userId,
        updateDataKeys: Object.keys(updateData)
      });

      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('Статья не найдена');
      }

      console.log('🔴 [Backend Service] Статья найдена:', {
        articleId: article._id,
        currentTitle: article.title,
        status: article.status,
        author: article.author
      });

      // КРИТИЧНО: нельзя редактировать published статьи
      if (article.status === 'published') {
        throw new Error('Опубликованные статьи нельзя редактировать');
      }

      const user = await User.findById(userId);

      // Проверка прав
      const isAuthor = article.author.toString() === userId.toString();
      const isAdmin = user.role === 'admin';

      if (!isAuthor && !isAdmin) {
        throw new Error('У вас нет прав на редактирование этой статьи');
      }

      // Статью на модерации (pending) может редактировать только админ
      if (article.status === 'pending' && !isAdmin) {
        throw new Error('Статья на модерации. Дождитесь решения администратора.');
      }

      // Обновляем разрешенные поля
      const allowedFields = [
        'title', 'slug', 'excerpt', 'content', 'category',
        'tags', 'seo'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          console.log(`🔴 [Backend Service] Обновление поля ${field}:`, {
            old: article[field],
            new: updateData[field]
          });
          article[field] = updateData[field];
        }
      });

      // ✅ ЛОГИРОВАНИЕ ПЕРЕД СОХРАНЕНИЕМ:
      console.log('🔴 [Backend Service] Сохранение статьи...');
      await article.save();
      console.log('✅ [Backend Service] Статья СОХРАНЕНА:', article._id);

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('❌ [Backend Service] updateArticle error:', {
        message: error.message,
        stack: error.stack
      });
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
      const article = await Article.findById(articleId);

      if (!article) {
        throw new Error('Статья не найдена');
      }

      const user = await User.findById(userId);

      if (!user) {
        throw new Error('Пользователь не найден');
      }

      // Определяем права
      const isAuthor = article.author.toString() === userId.toString();
      const isAdmin = user.role === 'admin';

      // ✅ НОВАЯ ПРОВЕРКА: Статью на модерации (pending) НЕЛЬЗЯ удалять
      if (article.status === 'pending') {
        throw new Error('Статья находится на модерации и не может быть удалена. Дождитесь решения администратора.');
      }

      // Опубликованную статью может удалить ТОЛЬКО админ
      if (article.status === 'published' && !isAdmin) {
        throw new Error('Опубликованные статьи может удалять только администратор');
      }

      // draft/rejected может удалить автор ИЛИ админ
      if (article.status === 'draft' || article.status === 'rejected') {
        if (!isAuthor && !isAdmin) {
          throw new Error('У вас нет прав на удаление этой статьи');
        }
      }

      await Article.findByIdAndDelete(articleId);

      console.log(`Статья удалена: ${article.title}`);

      return {
        success: true,
        message: 'Статья успешно удалена'
      };

    } catch (error) {
      console.error('Ошибка удаления статьи:', error);
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
      if (article.author.toString() !== userId.toString()) {
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

      return await this.getArticleById(article._id);

    } catch (error) {
      console.error('Ошибка отклонения статьи:', error);
      throw error;
    }
  }

  // ==================== ПОЛУЧЕНИЕ СПИСКОВ ====================


  async getPublishedArticles(options = {}) {
    try {
      const {
        page = 1,           // Номер страницы
        limit = 20,         // Количество статей на странице
        sortBy = 'createdAt', // Поле сортировки
        category = null,    // Slug категории
        author = null,      // ID или username автора
        search = null       // Поисковый запрос
      } = options;

      // Вычисляем skip из page
      const skip = (page - 1) * limit;

      // Определяем направление сортировки
      let sortField = sortBy;
      let sortOrder = -1; // По умолчанию DESC

      // Определяем порядок сортировки в зависимости от поля
      if (sortBy === 'title') {
        sortOrder = 1;  // A-Z для названий
      } else if (sortBy === 'views') {
        sortOrder = -1; // От большего к меньшему
      } else if (sortBy === 'createdAt' || sortBy === 'publishedAt') {
        sortOrder = -1; // Новые первыми
      }

      console.log(`📊 Sort: ${sortField} | Order: ${sortOrder === -1 ? 'DESC' : 'ASC'}`);

      // СОЗДАЕМ ДИНАМИЧЕСКИЙ ФИЛЬТР
      const filter = { status: 'published' };

      // ФИЛЬТРАЦИЯ ПО КАТЕГОРИИ через SLUG
      if (category) {
        const Category = mongoose.model('Category');
        const foundCategory = await Category.findOne({ slug: category });

        if (foundCategory) {
          filter.category = foundCategory._id;
          console.log(`🏷️ Category filter: ${category} → ${foundCategory._id}`);
        } else {
          // Если не найдена по slug, проверяем может это ID
          if (mongoose.Types.ObjectId.isValid(category)) {
            filter.category = new mongoose.Types.ObjectId(category);
            console.log(`🏷️ Category filter by ID: ${category}`);
          } else {
            console.log(`⚠️ Category not found: ${category}`);
          }
        }
      }

      // ФИЛЬТРАЦИЯ ПО АВТОРУ
      if (author) {
        if (mongoose.Types.ObjectId.isValid(author)) {
          filter.author = new mongoose.Types.ObjectId(author);
        } else {
          filter.author = author;
        }
      }

      // ПОИСК ПО ТЕКСТУ
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { excerpt: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      console.log('🔍 MongoDB Filter:', JSON.stringify(filter));

      // ✅ СОЗДАЁМ QUERY (не выполняем сразу)
      const query = Article.find(filter)
        .populate('author', 'firstName lastName avatar')
        .populate('category', 'name slug')
        .sort({ [sortField]: sortOrder })
        .limit(limit)
        .skip(skip);

      // ✅ ПРИМЕНЯЕМ COLLATION ТОЛЬКО ДЛЯ СОРТИРОВКИ ПО TITLE
      if (sortBy === 'title') {
        query.collation({
          locale: 'sk',      // Словацкая локаль
          strength: 1        // Игнорировать диакритику при сравнении (á = a)
        });
        console.log('🔤 Applied Slovak collation for title sorting');
      }

      // ✅ ВЫПОЛНЯЕМ QUERY
      const articles = await query;

      // Получаем общее количество
      const total = await Article.countDocuments(filter);

      // Расшифровываем статьи и авторов
      await Promise.all(
        articles.map(async (article) => {
          await cryptoService.smartDecrypt(article);

          // Явная расшифровка автора
          if (article.author && typeof article.author.decrypt === 'function') {
            await article.author.decrypt();
          }
        })
      );

      const totalPages = Math.ceil(total / limit);

      console.log(`✅ Found ${articles.length} articles | Total: ${total} | Page: ${page}/${totalPages}`);

      return {
        articles,
        total,
        page,
        totalPages
      };

    } catch (error) {
      console.error('❌ Error in getPublishedArticles:', error);
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

      // ✅ ИСПРАВЛЕНИЕ: Расшифровываем статьи И отдельно авторов
      await Promise.all(
        articles.map(async (article) => {
          await cryptoService.smartDecrypt(article);

          // ✅ ДОБАВЛЕНО: Явная расшифровка автора
          // if (article.author && typeof article.author.decrypt === 'function') {
          //   await article.author.decrypt();
          // }
        })
      );

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
        status = null
      } = options;

      const filter = { author: authorId };
      if (status) filter.status = status;

      const articles = await Article.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      // ✅ Расшифровываем массив статей (здесь нет populate author, но может быть в других полях)
      await Promise.all(
        articles.map(article => cryptoService.smartDecrypt(article))
      );

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
        .sort({ submittedAt: 1 });

      // ✅ ИСПРАВЛЕНИЕ: Расшифровываем статьи И отдельно авторов
      await Promise.all(
        articles.map(async (article) => {
          await cryptoService.smartDecrypt(article);

          // ✅ ДОБАВЛЕНО: Явная расшифровка автора
          if (article.author && typeof article.author.decrypt === 'function') {
            await article.author.decrypt();
          }
        })
      );

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

      // ✅ ИСПРАВЛЕНИЕ: Расшифровываем статьи И отдельно авторов
      await Promise.all(
        articles.map(async (article) => {
          await cryptoService.smartDecrypt(article);

          // ✅ ДОБАВЛЕНО: Явная расшифровка автора
          // if (article.author && typeof article.author.decrypt === 'function') {
          //   await article.author.decrypt();
          // }
        })
      );

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

      // ✅ ИСПРАВЛЕНИЕ: Расшифровываем статьи И отдельно авторов
      await Promise.all(
        articles.map(async (article) => {
          await cryptoService.smartDecrypt(article);

          // ✅ ДОБАВЛЕНО: Явная расшифровка автора
          // if (article.author && typeof article.author.decrypt === 'function') {
          //   await article.author.decrypt();
          // }
        })
      );

      return articles;

    } catch (error) {
      console.error('Ошибка поиска статей:', error);
      throw error;
    }
  }

  /**
   * Получение ВСЕХ статей для админа (с фильтрацией)
   * @param {Object} options - опции фильтрации
   * @returns {Object} - статьи с пагинацией
   */
  async getAllArticlesForAdmin(options) {
    try {
      const {
        limit = 100,
        page = 1,        // ✅ ИЗМЕНЕНО: принимаем page
        sortBy = 'createdAt',  // ✅ ИЗМЕНЕНО: значение по умолчанию
        status,
        search
      } = options;

      // ✅ ДОБАВЛЕНО: Backend сам вычисляет skip
      const skip = (page - 1) * limit;

      // Базовый фильтр (пустой - выбираем ВСЕ статьи)
      const filter = {};

      // Фильтр по статусу (если указан)
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Поиск по заголовку или содержимому
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { excerpt: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }

      // ✅ ИЗМЕНЕНО: Определяем направление сортировки
      let sortOrder;
      if (sortBy === 'views') {
        sortOrder = -1; // DESC: больше просмотров сверху
      } else if (sortBy === 'title') {
        sortOrder = 1;  // ASC: A-Z
      } else {
        sortOrder = -1; // DESC: новые сверху (для createdAt, publishedAt)
      }

      // Получаем статьи
      const articles = await Article.find(filter)
        .populate('author', 'firstName lastName email avatar role')
        .populate('category', 'name slug')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);

      // Расшифровываем статьи И отдельно авторов
      await Promise.all(
        articles.map(async (article) => {
          await cryptoService.smartDecrypt(article);

          // Явная расшифровка автора
          // if (article.author && typeof article.author.decrypt === 'function') {
          //   await article.author.decrypt();
          // }
        })
      );

      // Получаем общее количество
      const total = await Article.countDocuments(filter);

      // ✅ ИЗМЕНЕНО: Возвращаем правильные значения пагинации
      return {
        articles,
        total,
        page: page,                          // текущая страница
        totalPages: Math.ceil(total / limit) // общее количество страниц
      };

    } catch (error) {
      console.error('Ошибка получения всех статей для админа:', error);
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

export default new ArticleService();