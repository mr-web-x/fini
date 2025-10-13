// ============================================
// app.js — Главный файл приложения fini.sk
// ============================================

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from './config/index.js';
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

// Импорт маршрутов
import authRoutes from './routes/auth.route.js';
// (далее можно будет подключить articleRoutes, commentRoutes и т.д.)

// Базовые маршруты API
app.use('/api/auth', authRoutes);

// Тестовые маршруты
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'fini.sk API работает',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Добро пожаловать в fini.sk API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth'
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
        ...(config.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ==================== DATABASE CONNECTION ====================

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ MongoDB успешно подключена');
        console.log(`📊 База данных: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message);
        process.exit(1);
    }
};

// Обработка событий MongoDB
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB отключена');
});
mongoose.connection.on('error', (err) => {
    console.error('❌ Ошибка MongoDB:', err);
});

// ==================== SERVER START ====================

const startServer = async () => {
    try {
        await connectDB();

        const PORT = config.PORT || 10001;

        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════╗');
            console.log('║                                        ║');
            console.log('║      🚀 fini.sk API запущен успешно!  ║');
            console.log('║                                        ║');
            console.log(`║   📍 Порт: ${PORT.toString().padEnd(27)}║`);
            console.log(`║   🌍 Окружение: ${config.NODE_ENV.padEnd(19)} ║`);
            console.log(`║   📅 Время: ${new Date().toLocaleTimeString('ru-RU').padEnd(19)} ║`);
            console.log('║                                        ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('');
            console.log('📋 Доступные endpoints:');
            console.log(`   • Health Check: http://localhost:${PORT}/health`);
            console.log(`   • Auth API:     http://localhost:${PORT}/api/auth`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
};

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = async (signal) => {
    console.log(`\n⚠️ Получен сигнал ${signal}. Завершение работы...`);

    try {
        await mongoose.connection.close();
        console.log('✅ MongoDB соединение закрыто');
        console.log('👋 Сервер успешно остановлен');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение Promise:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанное исключение:', error);
    process.exit(1);
});

// ==================== START APPLICATION ====================

startServer();

// Экспорт для тестов
export default app;
