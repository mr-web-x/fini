// utils/constants.js

// HTTP статусы
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};

// Сообщения об ошибках
export const ERROR_MESSAGES = {
    // Auth
    INVALID_CREDENTIALS: 'Nesprávne prihlasovacie údaje',
    UNAUTHORIZED: 'Neautorizovaný prístup',
    TOKEN_EXPIRED: 'Token vypršal',
    TOKEN_INVALID: 'Neplatný token',

    // User
    USER_NOT_FOUND: 'Používateľ nebol nájdený',
    USER_EXISTS: 'Používateľ už existuje',

    // Article
    ARTICLE_NOT_FOUND: 'Článok nebol nájdený',

    // Category
    CATEGORY_NOT_FOUND: 'Kategória nebola nájdená',

    // Comment
    COMMENT_NOT_FOUND: 'Komentár nebol nájdený',

    // Validation
    VALIDATION_ERROR: 'Chyba validácie údajov',
    REQUIRED_FIELD: 'Povinné pole',

    // General
    INTERNAL_ERROR: 'Interná chyba servera',
    NOT_FOUND: 'Zdroj nebol nájdený',
    FORBIDDEN: 'Zakázané',
    BAD_REQUEST: 'Nesprávna požiadavka',
};

// Роли пользователей
export const USER_ROLES = {
    USER: 'user',
    AUTHOR: 'author',
    ADMIN: 'admin',
};

// Статусы статей
export const ARTICLE_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    PUBLISHED: 'published',
    REJECTED: 'rejected',
};

// Лимиты
export const LIMITS = {
    ARTICLES_PER_PAGE: 10,
    COMMENTS_PER_PAGE: 20,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
};

export default {
    HTTP_STATUS,
    ERROR_MESSAGES,
    USER_ROLES,
    ARTICLE_STATUS,
    LIMITS,
};