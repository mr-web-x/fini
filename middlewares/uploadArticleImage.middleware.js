import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Создаем папку для загрузки изображений статей
const uploadDir = path.join(process.cwd(), "uploads/articles");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Используем память для временного хранения
const storage = multer.memoryStorage();

// Фильтр для проверки типа файла (только изображения)
const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Дозволені лише зображення!"), false);
    }
    cb(null, true);
};

// Конфигурация multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB максимальный размер файла
    }
}).single("image"); // Одна картинка с полем "image"

// ✅ УЛУЧШЕННАЯ обработка изображения с агрессивной оптимизацией
const processImage = async (req, res, next) => {
    console.log('🔴 [Middleware] processImage вызван');
    console.log('🔴 [Middleware] req.file:', req.file ? 'Есть файл' : 'Нет файла');

    // Если файл не загружен, переходим дальше (картинка опциональна)
    if (!req.file) {
        console.log('⚠️ [Middleware] Файл не загружен, пропускаем');
        return next();
    }

    try {
        const originalSize = req.file.size;
        console.log('📊 [Middleware] Исходный размер файла:', (originalSize / 1024).toFixed(2), 'KB');

        // Генерируем уникальное имя файла
        const uniqueId = uuidv4();
        const timestamp = Date.now();
        const filename = `article-${uniqueId}-${timestamp}.webp`;
        const outputPath = path.join(uploadDir, filename);

        // ✅ АГРЕССИВНАЯ оптимизация для достижения ~80KB
        let quality = 80;
        let outputBuffer;
        let attempts = 0;
        const maxAttempts = 5;
        const targetSize = 80 * 1024; // 80KB в байтах

        // Первая попытка с начальным качеством
        outputBuffer = await sharp(req.file.buffer)
            .resize(1200, 630, {
                fit: "cover",
                position: "center"
            })
            .webp({ quality })
            .toBuffer();

        // Если размер больше 80KB, снижаем качество
        while (outputBuffer.length > targetSize && attempts < maxAttempts) {
            quality -= 10; // Снижаем качество на 10

            if (quality < 30) {
                quality = 30; // Минимальное качество 30
                break;
            }

            outputBuffer = await sharp(req.file.buffer)
                .resize(1200, 630, {
                    fit: "cover",
                    position: "center"
                })
                .webp({ quality })
                .toBuffer();

            attempts++;
            console.log(`🔄 [Middleware] Попытка ${attempts}: качество ${quality}, размер ${(outputBuffer.length / 1024).toFixed(2)} KB`);
        }

        // Сохраняем оптимизированное изображение
        await fs.promises.writeFile(outputPath, outputBuffer);

        const finalSize = outputBuffer.length;
        const compressionRatio = ((1 - finalSize / originalSize) * 100).toFixed(2);

        console.log('✅ [Middleware] Изображение сохранено:');
        console.log('   - Имя файла:', filename);
        console.log('   - Исходный размер:', (originalSize / 1024).toFixed(2), 'KB');
        console.log('   - Конечный размер:', (finalSize / 1024).toFixed(2), 'KB');
        console.log('   - Сжатие:', compressionRatio, '%');
        console.log('   - Финальное качество:', quality);

        // Добавляем имя файла в req для использования в контроллере
        req.uploadedImageName = filename;

        next();
    } catch (error) {
        console.error('❌ [Middleware] Ошибка обработки изображения:', error);
        return res.status(500).json({
            success: false,
            message: "Помилка обробки зображення",
            error: error.toString()
        });
    }
};

// Middleware для удаления изображения
const deleteImage = async (req, res, next) => {
    try {
        const { imageName } = req.params;
        const filePath = path.join(uploadDir, imageName);

        // Проверяем существование файла
        await fs.promises.access(filePath, fs.constants.F_OK);

        // Удаляем файл
        await fs.promises.unlink(filePath);

        // Сохраняем имя удаленного файла
        req.deletedImageName = imageName;

        next();
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                message: "Файл не знайдений"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Помилка при видаленні файлу",
            error: error.toString()
        });
    }
};

// Функция для удаления изображения по имени (используется в сервисах)
const deleteImageByName = async (imageName) => {
    try {
        if (!imageName) return;

        const filePath = path.join(uploadDir, imageName);

        // Проверяем существование файла
        await fs.promises.access(filePath, fs.constants.F_OK);

        // Удаляем файл
        await fs.promises.unlink(filePath);

        console.log('🗑️ [Middleware] Изображение удалено:', imageName);
        return true;
    } catch (error) {
        console.error(`❌ [Middleware] Ошибка удаления изображения ${imageName}:`, error);
        return false;
    }
};

export { upload, processImage, deleteImage, deleteImageByName };