const mongoose = require('mongoose');

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
  
  displayName: {
    type: String,
    required: [true, 'Имя обязательно'],
    trim: true,
    maxlength: [100, 'Имя может содержать максимум 100 символов']
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
  
  socialLinks: {
    linkedin: {
      type: String,
      default: ''
    },
    twitter: {
      type: String,
      default: ''
    }
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
  
  // Настройки уведомлений
  notifications: {
    emailOnReply: {
      type: Boolean,
      default: true
    },
    emailNewsletter: {
      type: Boolean,
      default: true
    },
    emailOnApproval: {
      type: Boolean,
      default: true
    },
    emailOnRejection: {
      type: Boolean,
      default: true
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

module.exports = mongoose.model('User', userSchema);