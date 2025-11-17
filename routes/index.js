// ============================================
// routes/index.js — Главный файл для всех роутов
// ============================================

import authRoutes from './auth.route.js';
import userRoutes from './user.route.js';
import articleRoutes from './article.route.js';
import categoryRoutes from './category.route.js';
import commentRoutes from './comment.route.js';
import adminUserRoutes from './adminUser.route.js';
import telegramRoutes from './telegram.route.js';
import imageRoutes from './image.route.js'; // ✨ NEW


export {
    authRoutes,
    userRoutes,
    articleRoutes,
    categoryRoutes,
    commentRoutes,
    adminUserRoutes,
    telegramRoutes,
    imageRoutes // ✨ NEW
};