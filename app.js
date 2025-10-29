// ============================================
// app.js — Express приложение fini.sk
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './middlewares/logger.js';

// ==== Загружаем переменные окружения ====
dotenv.config();

// ==== Инициализация приложения ====
const app = express();

// ==================== MIDDLEWARE ====================

// CORS — разрешаем запросы с клиента
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Парсинг JSON и формы
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование всех HTTP-запросов
app.use(logger);

// ==================== ROUTES ====================

// ✅ Импорт маршрутов через главный index.js
import {
    authRoutes,
    userRoutes,
    articleRoutes,
    categoryRoutes,
    commentRoutes,
    adminUserRoutes
} from './routes/index.js';

// Базовые маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin/users', adminUserRoutes);

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'fini.sk API работает',
        data: {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Добро пожаловать в fini.sk API',
        data: {
            version: '1.0.0',
            endpoints: {
                health: '/health',
                auth: '/api/auth',
                users: '/api/users',
                articles: '/api/articles',
                categories: '/api/categories',
                comments: '/api/comments'
            }
        }
    });
});

// ==================== ERROR HANDLING ====================

// 404 — маршрут не найден
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Маршрут не найден',
        path: req.originalUrl
    });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('❌ Глобальная ошибка:', err);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Внутренняя ошибка сервера',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ==================== EXPORT ====================

export default app;