// ============================================
// services/authService.js
// ============================================

import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import UserModel from '../models/User.model.js';
import cryptoService from './cryptoService.js';

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
        // Проверяем статус
        const statusCheck = await this.validateUserStatus(user);

        if (!statusCheck.valid) {
          throw new Error(statusCheck.message);
        }

        // Обновляем время последнего входа
        user.lastLogin = new Date();
        await user.save();

        console.log(`Пользователь вошел: ${user.email}`);
      } else {
        // Новый пользователь — создаём аккаунт
        user = await UserModel.create({
          email: googleData.email,
          googleId: googleData.googleId,
          firstName: googleData.firstName,
          lastName: googleData.lastName,
          avatar: googleData.avatar,
          role: 'user',
          lastLogin: new Date()
        });

        console.log(`Новый пользователь создан: ${user.email}`);
      }

      // Дешифруем данные перед отправкой на клиент
      await cryptoService.smartDecrypt(user);

      // Генерируем JWT токен
      const token = this.generateToken(user);

      return {
        user: this.formatUserResponse(user),
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

        // Блокировка истекла — разблокируем
        user.isBlocked.status = false;
        user.isBlocked.until = null;
        user.isBlocked.reason = '';
        user.isBlocked.blockedBy = null;
        await user.save();
      }

      return { valid: true };
    } catch (error) {
      console.error('Ошибка валидации статуса пользователя:', error);
      return {
        valid: false,
        message: 'Ошибка проверки статуса пользователя'
      };
    }
  }

  // ==================== JWT ТОКЕНЫ ====================

  generateToken(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRATION || '7d',
      issuer: 'fini.sk',
      audience: 'fini-users'
    });
  }

  async refreshToken(oldToken) {
    try {
      const user = await this.getUserFromToken(oldToken);
      return this.generateToken(user);
    } catch {
      throw new Error('Не удалось обновить токен');
    }
  }

  // ==================== УПРАВЛЕНИЕ ПРОФИЛЕМ ====================

  async getUserInfo(userId) {
    try {
      const user = await UserModel.findById(userId).select('-__v');
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      await cryptoService.smartDecrypt(user);
      return this.formatUserResponse(user);
    } catch (error) {
      console.error('Ошибка получения информации о пользователе:', error);
      throw error;
    }
  }

  async updateProfile(userId, updateData) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('Пользователь не найден');
      }

      const allowedFields = [
        'firstName',
        'lastName',
        'bio',
        'position',
        'showInAuthorsList'
      ];

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          user[field] = updateData[field];
        }
      });

      await user.save();
      console.log(`Профиль обновлен: ${user.email}`);

      await cryptoService.smartDecrypt(user);
      return this.formatUserResponse(user);
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      throw error;
    }
  }

  // ==================== УТИЛИТЫ ====================

  formatUserResponse(user) {
    return {
      id: user._id,
      email: user.email,
      googleId: user.googleId,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      bio: user.bio,
      position: user.position,
      showInAuthorsList: user.showInAuthorsList,
      isBlocked: user.isBlocked,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  checkRole(user, requiredRole) {
    const roleHierarchy = {
      user: 1,
      author: 2,
      admin: 3
    };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  canWriteArticles(user) {
    return user.role === 'author' || user.role === 'admin';
  }

  canModerate(user) {
    return user.role === 'admin';
  }
}

export default new AuthService();
