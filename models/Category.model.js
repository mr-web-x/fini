import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название категории обязательно'],
    trim: true,
    unique: true,
    maxlength: [50, 'Название может содержать максимум 50 символов']
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  // ✅ ИСПРАВЛЕНО: description теперь опционален
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание может содержать максимум 500 символов'],
    default: ''  // ✅ Добавлено значение по умолчанию
  },

  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title может содержать максимум 60 символов'],
      default: ''
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description может содержать максимум 160 символов'],
      default: ''
    }
  },

  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ==================== ИНДЕКСЫ ====================
categorySchema.index({ slug: 1 });
categorySchema.index({ order: 1 });

export default mongoose.model('Category', categorySchema);