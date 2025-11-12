// ============================================
// services/authService.js
// ============================================

import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import UserModel from '../models/User.model.js';
import cryptoService from './cryptoService.js';
// ✅ НОВОЕ: Импортируем generateSlug
import generateSlug from '../utils/slugGenerator.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  // ==================== GOOGLE OAUTH ====================

  /**
   * Верификация Google ID токена
   * @param {string} token - Google ID токен
   * @returns {Object} - данные пользователя из Google
   */
  async verifyGoogleToken(token) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      // Проверка издателя
      if (
        payload.iss !== 'accounts.google.com' &&
        payload.iss !== 'https://accounts.google.com'
      ) {
        throw new Error('Неверный издатель токена');
      }

      return {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        avatar: payload.picture || ''
      };
    } catch (error) {
      console.error('Ошибка верификации Google токена:', error);
      throw new Error('Неверный Google токен');
    }
  }

  /**
   * Вход или регистрация через Google OAuth
   * @param {string} googleToken - Google ID токен
   * @returns {Object} - пользователь и JWT токен
   */
  async googleAuth(googleToken) {
    try {
      // Верифицируем Google токен
      const googleData = await this.verifyGoogleToken(googleToken);

      // Ищем существующего пользователя
      let user = await UserModel.findOne({ googleId: googleData.googleId });

      if (user) {
        const statusCheck = await this.validateUserStatus(user);
        if (!statusCheck.valid) {
          throw new Error(statusCheck.message);
        }

        user.lastLogin = new Date();
        await user.save();
        console.log(`✅ Пользователь вошел: ${googleData.googleId}`);
      } else {
        // ✅ НОВОЕ: Генерируем slug для нового пользователя
        let slug = null;
        if (googleData.firstName && googleData.lastName) {
          const baseSlug = generateSlug(`${googleData.firstName}-${googleData.lastName}`);

          // Проверяем уникальность slug
          let uniqueSlug = baseSlug;
          let counter = 1;

          while (await UserModel.findOne({ slug: uniqueSlug })) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
          }

          slug = uniqueSlug;
          console.log(`✅ Сгенерирован slug для нового пользователя: ${slug}`);
        }

        // Новый пользователь
        user = await UserModel.create({
          email: googleData.email,
          googleId: googleData.googleId,
          firstName: googleData.firstName,
          lastName: googleData.lastName,
          avatar: googleData.avatar,
          role: 'user',
          slug: slug, // ✅ НОВОЕ: Сохраняем slug
          lastLogin: new Date()
        });

        console.log(`✅ Новый пользователь создан: ${user.email} (slug: ${slug})`);
      }

      try {
        await cryptoService.smartDecrypt(user)
      } catch (error) {
        console.log("Ошибка расшифровки:", error.message)
      }

      console.log('✅ Расшифрованные данные:', {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        slug: user.slug // ✅ НОВОЕ: Логируем slug
      });

      // Генерируем JWT с расшифрованными данными
      const token = this.generateToken(user);

      return {
        user: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
          slug: user.slug // ✅ НОВОЕ: Возвращаем slug в ответе
        },
        token
      };
    } catch (error) {
      console.error('Ошибка Google авторизации:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по JWT токену
   * @param {string} token - JWT токен
   * @returns {Object} - пользователь
   */
  async getUserFromToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      const statusCheck = await this.validateUserStatus(user);
      if (!statusCheck.valid) {
        throw new Error(statusCheck.message);
      }

      await cryptoService.smartDecrypt(user);
      return user;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Токен истек');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Неверный токен');
      }
      throw error;
    }
  }

  // ==================== ВАЛИДАЦИЯ ПОЛЬЗОВАТЕЛЯ ====================

  /**
   * Проверка статуса пользователя (блокировка)
   */
  async validateUserStatus(user) {
    try {
      if (user.isBlocked.status) {
        if (!user.isBlocked.until) {
          return {
            valid: false,
            message: `Аккаунт заблокирован навсегда. Причина: ${user.isBlocked.reason}`
          };
        }

        if (user.isBlocked.until > new Date()) {
          const daysLeft = Math.ceil(
            (user.isBlocked.until - new Date()) / (1000 * 60 * 60 * 24)
          );

          return {
            valid: false,
            message: `Аккаунт заблокирован до ${user.isBlocked.until.toLocaleDateString()}. Осталось дней: ${daysLeft}. Причина: ${user.isBlocked.reason}`
          };
        }

        // Блокировка истекла - разблокируем
        user.isBlocked = {
          status: false,
          until: null,
          reason: '',
          blockedBy: null
        };
        await user.save();
        console.log(`✅ Пользователь ${user.email} автоматически разблокирован`);
      }

      return { valid: true };
    } catch (error) {
      console.error('Ошибка проверки статуса пользователя:', error);
      throw error;
    }
  }

  // ==================== JWT ТОКЕНЫ ====================

  /**
   * Генерация JWT токена
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );
  }

  /**
   * Обновление JWT токена
   */
  async refreshToken(oldToken) {
    try {
      const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, {
        ignoreExpiration: true
      });

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      const statusCheck = await this.validateUserStatus(user);
      if (!statusCheck.valid) {
        throw new Error(statusCheck.message);
      }

      return this.generateToken(user);
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      throw new Error('Неверный токен');
    }
  }
}

export default new AuthService();