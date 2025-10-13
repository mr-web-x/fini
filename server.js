// ============================================
// server.js — Запуск сервера fini.sk
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import config from './config/index.js';

// ==== Загружаем переменные окружения ====
dotenv.config();

const PORT = config.PORT || 10001;

// ==================== DATABASE CONNECTION ====================

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ MongoDB успешно подключена');
        console.log(`📊 База данных: ${mongoose.connection.name}`);

        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error.message);
        throw error;
    }
};

// Обработка событий MongoDB
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB отключена');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Ошибка MongoDB:', err);
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB переподключена');
});

// ==================== SERVER START ====================

const startServer = async () => {
    try {
        // 1. Подключаемся к базе данных
        await connectDB();

        // 2. Запускаем сервер
        const server = app.listen(PORT, () => {
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
            console.log(`   • API Root:     http://localhost:${PORT}/`);
            console.log(`   • Auth API:     http://localhost:${PORT}/api/auth`);
            console.log('');
        });

        // Возвращаем сервер для graceful shutdown
        return server;

    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
};

// ==================== GRACEFUL SHUTDOWN ====================

const gracefulShutdown = (server) => async (signal) => {
    console.log(`\n⚠️ Получен сигнал ${signal}. Завершение работы...`);

    try {
        // 1. Закрываем HTTP сервер (перестаем принимать новые соединения)
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('✅ HTTP сервер закрыт');

        // 2. Закрываем соединение с MongoDB
        await mongoose.connection.close();
        console.log('✅ MongoDB соединение закрыто');

        console.log('👋 Сервер успешно остановлен');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка при завершении работы:', error);
        process.exit(1);
    }
};

// ==================== ERROR HANDLERS ====================

// Необработанные Promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Необработанное отклонение Promise:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

// Необработанные исключения
process.on('uncaughtException', (error) => {
    console.error('❌ Необработанное исключение:', error);
    process.exit(1);
});

// ==================== START APPLICATION ====================

// Запускаем сервер и сохраняем ссылку для graceful shutdown
startServer().then((server) => {
    // Обработка сигналов завершения
    process.on('SIGTERM', gracefulShutdown(server));
    process.on('SIGINT', gracefulShutdown(server));
});