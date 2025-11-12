// ============================================
// migrations/addSlugToUsers.js
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../models/User.model.js';
import cryptoService from '../services/cryptoService.js';
import generateSlug from '../utils/slugGenerator.js';

// Загружаем переменные окружения
dotenv.config();

/**
 * Миграция: Добавление slug для всех существующих пользователей
 * 
 * Этот скрипт:
 * 1. Находит всех пользователей без slug
 * 2. Расшифровывает их firstName и lastName
 * 3. Генерирует уникальный slug
 * 4. Сохраняет slug в базу
 */
async function addSlugToUsers() {
    try {
        console.log('🚀 Начинаем миграцию: добавление slug для пользователей...\n');

        // Подключаемся к MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Подключено к MongoDB\n');

        // Находим всех пользователей без slug
        const usersWithoutSlug = await UserModel.find({
            $or: [
                { slug: null },
                { slug: { $exists: false } }
            ]
        });

        console.log(`📊 Найдено пользователей без slug: ${usersWithoutSlug.length}\n`);

        if (usersWithoutSlug.length === 0) {
            console.log('✅ Все пользователи уже имеют slug. Миграция не требуется.');
            return;
        }

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        // Обрабатываем каждого пользователя
        for (const user of usersWithoutSlug) {
            try {
                // Расшифровываем данные пользователя
                await cryptoService.smartDecrypt(user);

                // Проверяем наличие firstName и lastName
                if (!user.firstName || !user.lastName) {
                    console.log(`⚠️  Пропускаем ${user.email} - отсутствует firstName или lastName`);
                    skipCount++;
                    continue;
                }

                // Генерируем базовый slug
                const baseSlug = generateSlug(`${user.firstName}-${user.lastName}`);

                // Проверяем уникальность slug
                let uniqueSlug = baseSlug;
                let counter = 1;

                while (await UserModel.findOne({ slug: uniqueSlug, _id: { $ne: user._id } })) {
                    uniqueSlug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Сохраняем slug
                user.slug = uniqueSlug;
                await user.save();

                console.log(`✅ ${user.email} → slug: "${uniqueSlug}"`);
                successCount++;

            } catch (error) {
                console.error(`❌ Ошибка обработки ${user.email}:`, error.message);
                errorCount++;
            }
        }

        // Итоговая статистика
        console.log('\n' + '='.repeat(60));
        console.log('📊 ИТОГИ МИГРАЦИИ:');
        console.log('='.repeat(60));
        console.log(`✅ Успешно обработано: ${successCount}`);
        console.log(`⚠️  Пропущено: ${skipCount}`);
        console.log(`❌ Ошибок: ${errorCount}`);
        console.log(`📊 Всего пользователей: ${usersWithoutSlug.length}`);
        console.log('='.repeat(60) + '\n');

        if (successCount > 0) {
            console.log('🎉 Миграция завершена успешно!');
        }

    } catch (error) {
        console.error('❌ Критическая ошибка миграции:', error);
        throw error;
    } finally {
        // Закрываем подключение к БД
        await mongoose.connection.close();
        console.log('\n✅ Подключение к MongoDB закрыто');
    }
}

// Запускаем миграцию
addSlugToUsers()
    .then(() => {
        console.log('\n✅ Скрипт миграции завершён');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Скрипт миграции завершён с ошибкой:', error);
        process.exit(1);
    });