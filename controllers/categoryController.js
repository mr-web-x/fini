// ============================================
// controllers/categoryController.js
// ============================================

import Category from '../models/Category.model.js';
import Article from '../models/Article.model.js';

class CategoryController {

    async getAllCategories(req, res) {
        try {
            const categories = await Category.find()
                .sort({ order: 1, name: 1 })
                .select('-__v');

            return res.status(200).json({
                success: true,
                message: 'Категории получены',
                data: {
                    categories,
                    count: categories.length
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при получении категорий'
            });
        }
    }

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

            return res.status(200).json({
                success: true,
                message: 'Категория получена',
                data: category
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при получении категории'
            });
        }
    }

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

            return res.status(200).json({
                success: true,
                message: 'Категория получена',
                data: category
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при получении категории'
            });
        }
    }

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

            return res.status(201).json({
                success: true,
                message: 'Категория успешно создана',
                data: category
            });

        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Категория с таким названием или slug уже существует'
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при создании категории'
            });
        }
    }

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

            return res.status(200).json({
                success: true,
                message: 'Категория успешно обновлена',
                data: category
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при обновлении категории'
            });
        }
    }

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
            const articlesCount = await Article.countDocuments({ category: id });

            if (articlesCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Нельзя удалить категорию, в ней ${articlesCount} статей. Сначала переместите или удалите статьи.`
                });
            }

            await Category.findByIdAndDelete(id);

            return res.status(200).json({
                success: true,
                message: 'Категория успешно удалена'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при удалении категории'
            });
        }
    }

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

            // Статистика статей в категории
            const totalArticles = await Article.countDocuments({
                category: id,
                status: 'published'
            });

            const totalViews = await Article.aggregate([
                { $match: { category: category._id, status: 'published' } },
                { $group: { _id: null, total: { $sum: '$views' } } }
            ]);

            return res.status(200).json({
                success: true,
                message: 'Статистика категории получена',
                data: {
                    category,
                    stats: {
                        totalArticles,
                        totalViews: totalViews[0]?.total || 0
                    }
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Ошибка при получении статистики'
            });
        }
    }
}

export default new CategoryController();