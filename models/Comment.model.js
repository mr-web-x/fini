import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: [true, 'Статья обязательна']
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Пользователь обязателен']
  },

  content: {
    type: String,
    required: [true, 'Содержимое комментария обязательно'],
    trim: true,
    minlength: [3, 'Komentár musí obsahovať minimálne 3 znaky'],
    maxlength: [2000, 'Комментарий может содержать максимум 2000 символов']
  },

  // Удаление комментариев
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// ==================== ИНДЕКСЫ ====================
commentSchema.index({ article: 1, createdAt: -1 });
commentSchema.index({ user: 1 });
commentSchema.index({ isDeleted: 1 });

export default mongoose.model('Comment', commentSchema);