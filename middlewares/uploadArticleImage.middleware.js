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

// Middleware для обработки изображения
const processImage = async (req, res, next) => {
    // Если файл не загружен, переходим дальше (картинка опциональна)
    if (!req.file) {
        return next();
    }

    try {
        // Генерируем уникальное имя файла
        const uniqueId = uuidv4();
        const timestamp = Date.now();
        const filename = `article-${uniqueId}-${timestamp}.webp`;
        const outputPath = path.join(uploadDir, filename);

        // Обрабатываем изображение через Sharp
        await sharp(req.file.buffer)
            .resize(1200, 630, {
                fit: "cover", // Обрезаем до точного размера 1200x630
                position: "center"
            })
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Добавляем имя файла в req для использования в контроллере
        req.uploadedImageName = filename;

        next();
    } catch (error) {
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

        return true;
    } catch (error) {
        console.error(`Ошибка удаления изображения ${imageName}:`, error);
        return false;
    }
};

export { upload, processImage, deleteImage, deleteImageByName };