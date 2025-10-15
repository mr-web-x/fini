// ============================================
// routes/index.js — Главный файл для всех роутов
// ============================================

import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import articleRoutes from './article.route.js';
import categoryRoutes from './category.route.js';
import commentRoutes from './comment.route.js';

export {
    authRoutes,
    userRoutes,
    articleRoutes,
    categoryRoutes,
    commentRoutes
};