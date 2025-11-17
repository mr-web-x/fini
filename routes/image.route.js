// ============================================
// routes/image.route.js
// ============================================

import express from 'express';
import imageController from '../controllers/imageController.js';
import { upload, processImage, deleteImage } from '../middlewares/uploadArticleImage.middleware.js';
import {
    authenticate,
    requireAuthor
} from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route POST /api/images/upload
 * @desc Загрузка изображения для статьи
 * @access Private (author/admin)
 */
router.post(
    '/upload',
    authenticate,
    requireAuthor,
    upload,
    processImage,
    imageController.uploadImage
);

/**
 * @route DELETE /api/images/:imageName
 * @desc Удаление изображения
 * @access Private (author/admin)
 */
router.delete(
    '/:imageName',
    authenticate,
    requireAuthor,
    deleteImage,
    imageController.deleteImage
);

/**
 * @route GET /api/images/:imageName
 * @desc Получение информации об изображении
 * @access Public
 */
router.get(
    '/:imageName',
    imageController.getImageInfo
);

export default router;