// ============================================
// controllers/imageController.js
// ============================================

class ImageController {
  /**
   * Загрузка изображения
   * @route POST /api/images/upload
   * @access Private (author/admin)
   */
  async uploadImage(req, res) {
    try {
      // Проверяем что изображение было загружено
      if (!req.uploadedImageName) {
        return res.status(400).json({
          success: false,
          message: 'Зображення не завантажено'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Зображення успішно завантажено',
        data: {
          imageName: req.uploadedImageName,
          imageUrl: `/uploads/articles/${req.uploadedImageName}`
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Помилка завантаження зображення',
        error: error.message
      });
    }
  }

  /**
   * Удаление изображения
   * @route DELETE /api/images/:imageName
   * @access Private (author/admin)
   */
  async deleteImage(req, res) {
    try {
      // deletedImageName добавляется middleware deleteImage
      if (!req.deletedImageName) {
        return res.status(400).json({
          success: false,
          message: 'Зображення не видалено'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Зображення успішно видалено',
        data: {
          deletedImage: req.deletedImageName
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Помилка видалення зображення',
        error: error.message
      });
    }
  }

  /**
   * Получение информации об изображении
   * @route GET /api/images/:imageName
   * @access Public
   */
  async getImageInfo(req, res) {
    try {
      const { imageName } = req.params;

      // Простая проверка существования файла
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'uploads/articles', imageName);

      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        
        // Получаем информацию о файле
        const stats = await fs.promises.stat(filePath);

        return res.status(200).json({
          success: true,
          message: 'Інформація про зображення',
          data: {
            imageName: imageName,
            imageUrl: `/uploads/articles/${imageName}`,
            size: stats.size,
            created: stats.birthtime
          }
        });
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: 'Зображення не знайдено'
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Помилка отримання інформації',
        error: error.message
      });
    }
  }
}

export default new ImageController();