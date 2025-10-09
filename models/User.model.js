import mongoose from 'mongoose';
import EncryptableService from '../services/encryptableService';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    trim: true
  },

  googleId: {
    type: String,
    required: true,
    unique: true
  },

  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'Имя может содержать максимум 50 символов'],
    default: ''
  },

  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Фамилия может содержать максимум 50 символов'],
    default: ''
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
    maxlength: [500, 'Биография может содержать максимум 500 символов'],
    default: ''
  },

  position: {
    type: String,
    maxlength: [100, 'Должность может содержать максимум 100 символов'],
    default: ''
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

EncryptableService.applyEncryption(userSchema, [
  "email",
  "firstName",
  "lastName",
  "bio"
]);

export default mongoose.model('User', userSchema);
