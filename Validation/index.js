// ============================================
// middlewares/validators/index.js (объединение всех валидаторов)
// ============================================

import articleValidator from './articleValidator.js';
import categoryValidator from './categoryValidator.js';
import commentValidator from './commentValidator.js';
import authValidator from './authValidator.js';
import commonValidator from './commonValidator.js';

export {
    articleValidator,
    categoryValidator,
    commentValidator,
    authValidator,
    commonValidator
};

// Для удобства можно экспортировать всё вместе
export default {
    article: articleValidator,
    category: categoryValidator,
    comment: commentValidator,
    auth: authValidator,
    common: commonValidator
};