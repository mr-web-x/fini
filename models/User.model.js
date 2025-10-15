import mongoose from 'mongoose';
import EncryptableService from '../services/encryptableService.js';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    trim: true
    // ❌ НЕТ maxlength - поле шифруется!
  },

  googleId: {
    type: String,
    required: true,
    unique: true
  },

  firstName: {
    type: String,
    trim: true,
    maxlength: [200, 'Имя может содержать максимум 50 символов (200 после шифрования)'],
    default: ''
    // ✅ Увеличено до 200 для зашифрованных данных
  },

  lastName: {
    type: String,
    trim: true,
    maxlength: [200, 'Фамилия может содержать максимум 50 символов (200 после шифрования)'],
    default: ''
    // ✅ Увеличено до 200 для зашифрованных данных
  },

  avatar: {
    type: String,
    default: ''
  },

  role: {
    type: String,
    enum: ['user', 'author', 'admin'],
    default: 'user'
  },

  // Для авторов (author и admin)
  bio: {
    type: String,
    maxlength: [2000, 'Биография может содержать максимум 500 символов (2000 после шифрования)'],
    default: ''
    // ✅ Увеличено до 2000 для зашифрованных данных
  },

  position: {
    type: String,
    maxlength: [100, 'Должность может содержать максимум 100 символов'],
    default: ''
    // ✅ Это поле НЕ шифруется, оставляем 100
  },

  showInAuthorsList: {
    type: Boolean,
    default: true
  },

  // Блокировка
  isBlocked: {
    status: {
      type: Boolean,
      default: false
    },
    until: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      default: ''
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },

  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ==================== ИНДЕКСЫ ====================
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'isBlocked.status': 1 });

// ==================== ШИФРОВАНИЕ ====================
// ⚠️ Эти поля будут зашифрованы, поэтому maxlength увеличен!
EncryptableService.applyEncryption(userSchema, [
  "email",      // Нет maxlength
  "firstName",  // maxlength: 200
  "lastName",   // maxlength: 200
  "bio"         // maxlength: 2000
]);

export default mongoose.model('User', userSchema);