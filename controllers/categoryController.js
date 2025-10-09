import Category from '../models/Category.model.js';

class CategoryController {

    // ==================== CRUD ОПЕРАЦИИ ====================

    /**
     * Получение всех категорий
     * GET /api/categories
     */
    async getAllCategories(req, res) {
        try {
            const categories = await Category.find()
                .sort({ order: 1, name: 1 })
                .select('-__v');

            res.status(200).json({
                success: true,
                data: categories,
                count: categories.length
            });

        } catch (error) {
            console.error('Ошибка получения категорий:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении категорий',
                error: error.message
            });
        }
    }

    /**
     * Получение категории по ID
     * GET /api/categories/:id
     */
    async getCategoryById(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Категория не найдена'
                });
            }

            res.status(200).json({
                success: true,
                data: category
            });

        } catch (error) {
            console.error('Ошибка получения категории:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении категории',
                error: error.message
            });
        }
    }

    /**
     * Получение категории по slug
     * GET /api/categories/slug/:slug
     */
    async getCategoryBySlug(req, res) {
        try {
            const { slug } = req.params;

            const category = await Category.findOne({ slug });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Категория не найдена'
                });
            }

            res.status(200).json({
                success: true,
                data: category
            });

        } catch (error) {
            console.error('Ошибка получения категории по slug:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении категории',
                error: error.message
            });
        }
    }

    /**
     * Создание категории (только админ)
     * POST /api/categories
     */
    async createCategory(req, res) {
        try {
            const { name, slug, description, seo, order } = req.body;

            // Проверка прав (только админ)
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Только администратор может создавать категории'
                });
            }

            // Проверка обязательных полей
            if (!name || !slug || !description) {
                return res.status(400).json({
                    success: false,
                    message: 'Название, slug и описание обязательны'
                });
            }

            // Проверка уникальности slug
            const existingCategory = await Category.findOne({ slug });
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Категория с таким slug уже существует'
                });
            }

            // Создание категории
            const category = await Category.create({
                name,
                slug,
                description,
                seo: seo || {},
                order: order || 0
            });

            res.status(201).json({
                success: true,
                message: 'Категория успешно создана',
                data: category
            });

        } catch (error) {
            console.error('Ошибка создания категории:', error);

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Категория с таким названием или slug уже существует'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Ошибка при создании категории',
                error: error.message
            });
        }
    }

    /**
     * Обновление категории (только админ)
     * PUT /api/categories/:id
     */
    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const { name, slug, description, seo, order } = req.body;

            // Проверка прав (только админ)
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Только администратор может редактировать категории'
                });
            }

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Категория не найдена'
                });
            }

            // Проверка уникальности slug (если меняется)
            if (slug && slug !== category.slug) {
                const existingCategory = await Category.findOne({
                    slug,
                    _id: { $ne: id }
                });

                if (existingCategory) {
                    return res.status(400).json({
                        success: false,
                        message: 'Категория с таким slug уже существует'
                    });
                }
            }

            // Обновление полей
            if (name) category.name = name;
            if (slug) category.slug = slug;
            if (description) category.description = description;
            if (seo) category.seo = { ...category.seo, ...seo };
            if (order !== undefined) category.order = order;

            await category.save();

            res.status(200).json({
                success: true,
                message: 'Категория успешно обновлена',
                data: category
            });

        } catch (error) {
            console.error('Ошибка обновления категории:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при обновлении категории',
                error: error.message
            });
        }
    }

    /**
     * Удаление категории (только админ)
     * DELETE /api/categories/:id
     */
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;

            // Проверка прав (только админ)
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Только администратор может удалять категории'
                });
            }

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Категория не найдена'
                });
            }

            // Проверка, есть ли статьи в этой категории
            const Article = require('../models/Article.model.js').default;
            const articlesCount = await Article.countDocuments({ category: id });

            if (articlesCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Нельзя удалить категорию, в ней ${articlesCount} статей. Сначала переместите или удалите статьи.`
                });
            }

            await Category.findByIdAndDelete(id);

            res.status(200).json({
                success: true,
                message: 'Категория успешно удалена'
            });

        } catch (error) {
            console.error('Ошибка удаления категории:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при удалении категории',
                error: error.message
            });
        }
    }

    // ==================== СТАТИСТИКА ====================

    /**
     * Получение категории со статистикой статей
     * GET /api/categories/:id/stats
     */
    async getCategoryStats(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Категория не найдена'
                });
            }

            const Article = require('../models/Article.model.js').default;

            // Статистика статей в категории
            const totalArticles = await Article.countDocuments({
                category: id,
                status: 'published'
            });

            const totalViews = await Article.aggregate([
                { $match: { category: category._id, status: 'published' } },
                { $group: { _id: null, total: { $sum: '$views' } } }
            ]);

            res.status(200).json({
                success: true,
                data: {
                    category,
                    stats: {
                        totalArticles,
                        totalViews: totalViews[0]?.total || 0
                    }
                }
            });

        } catch (error) {
            console.error('Ошибка получения статистики категории:', error);
            res.status(500).json({
                success: false,
                message: 'Ошибка при получении статистики',
                error: error.message
            });
        }
    }
}

export default new CategoryController();