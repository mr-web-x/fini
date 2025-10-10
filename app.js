// app.js - Главный файл приложения fini.sk
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './middlewares/logger.js';
import config from './config/index.js';

// Инициализация dotenv
dotenv.config();

// Создание Express приложения
const app = express();

// ==================== MIDDLEWARE ====================

// CORS - разрешаем запросы с клиента
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Логирование всех HTTP запросов
app.use(logger);

// ==================== ROUTES ====================

// Здоровье сервера (проверка работоспособности)
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'fini.sk API работает',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV
    });
});

// Корневой маршрут
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Добро пожаловать в fini.sk API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api'
        }
    });
});

// API маршруты (будут подключены позже)
// import routes from './routes/index.js';
// app.use('/api', routes);

// Временная заглушка для API
app.use('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API маршруты будут подключены позже',
        requested: req.originalUrl
    });
});

// ==================== ERROR HANDLING ====================

// Обработка 404 - маршрут не найден
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

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Внутренняя ошибка сервера';

    res.status(statusCode).json({
        success: false,
        message,
        ...(config.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err
        })
    });
});

// ==================== DATABASE CONNECTION ====================

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI, {
            // Опции подключения
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ MongoDB успешно подключена');
        console.log(`📊 База данных: ${mongoose.connection.name}`);

    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message);
        process.exit(1); // Завершаем процесс при ошибке подключения
    }
};

// Обработка событий подключения MongoDB
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB отключена');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB ошибка:', err);
});

// ==================== SERVER START ====================

const startServer = async () => {
    try {
        // Подключаемся к базе данных
        await connectDB();

        // Запускаем сервер
        const PORT = config.PORT || 10001;

        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════╗');
            console.log('║                                        ║');
            console.log(`║   🚀 fini.sk API запущен успешно!    ║`);
            console.log('║                                        ║');
            console.log(`║   📍 Порт: ${PORT}                        ║`);
            console.log(`║   🌍 Окружение: ${config.NODE_ENV.padEnd(19)} ║`);
            console.log(`║   📅 Время: ${new Date().toLocaleTimeString('ru-RU').padEnd(19)} ║`);
            console.log('║                                        ║');
            console.log('╚════════════════════════════════════════╝');
            console.log('');
            console.log('📋 Доступные endpoints:');
            console.log(`   • Health Check: http://localhost:${PORT}/health`);
            console.log(`   • API Base: http://localhost:${PORT}/api`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
};

// ==================== GRACEFUL SHUTDOWN ====================

// Обработка завершения процесса
const gracefulShutdown = async (signal) => {
    console.log(`\n⚠️ Получен сигнал ${signal}. Завершаем работу...`);

    try {
        // Закрываем соединение с MongoDB
        await mongoose.connection.close();
        console.log('✅ MongoDB соединение закрыто');

        console.log('👋 Сервер успешно остановлен');
        process.exit(0);

    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
};

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных отклонений Promise
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение Promise:', reason);
    console.error('Promise:', promise);
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанное исключение:', error);
    process.exit(1);
});

// ==================== START APPLICATION ====================

startServer();

// Экспорт приложения (для тестов)
export default app;