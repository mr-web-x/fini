const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Заголовок статьи обязателен'],
    trim: true,
    maxlength: [200, 'Заголовок может содержать максимум 200 символов']
  },
  
  slug: {
    type: String,
    required: [true, 'Slug обязателен'],
    unique: true,
    lowercase: true,
    trim: true
  },
  
  excerpt: {
    type: String,
    required: [true, 'Краткое описание обязательно'],
    trim: true,
    minlength: [150, 'Описание должно содержать минимум 150 символов'],
    maxlength: [200, 'Описание может содержать максимум 200 символов']
  },
  
  content: {
    type: String,
    required: [true, 'Содержимое статьи обязательно']
  },
  
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Категория обязательна']
  },
  
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Автор обязателен']
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // SEO настройки
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
  
  // Система статусов
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'draft'
  },
  
  // Для rejected статуса
  rejectionReason: {
    type: String,
    default: ''
  },
  
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  rejectedAt: {
    type: Date
  },
  
  // Статистика
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Даты
  publishedAt: {
    type: Date
  },
  
  submittedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// ==================== ИНДЕКСЫ ====================
articleSchema.index({ slug: 1 });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ views: -1 });
articleSchema.index({ createdAt: -1 });

// Индекс полнотекстового поиска
articleSchema.index({ 
  title: 'text', 
  excerpt: 'text', 
  content: 'text' 
});

module.exports = mongoose.model('Article', articleSchema);