// ============================================
// jest.config.js - Конфигурация для ES Modules
// ============================================

export default {
    // Используем Node.js окружение
    testEnvironment: 'node',

    // Игнорируем node_modules при покрытии
    coveragePathIgnorePatterns: ['/node_modules/'],

    // Паттерн поиска тестов
    testMatch: ['**/tests/unit/**/*.test.js'],

    // Собираем покрытие только для этих файлов
    collectCoverageFrom: [
        'services/userService.js',
        'services/authService.js',
        'services/articleService.js',
        'services/commentService.js',
        '!services/encryptableService.js',
        '!services/cryptoService.js'
    ],

    // Минимальные пороги покрытия
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 80,
            functions: 80,
            lines: 80
        }
    },

    // Таймаут для тестов
    testTimeout: 10000,

    // Файл настройки перед тестами
    setupFilesAfterEnv: ['./tests/setup.js'],

    // ⚠️ ВАЖНО: Отключаем трансформацию для ES modules
    transform: {},

    // Не нужно указывать extensionsToTreatAsEsm для .js
    // Jest автоматически определяет это из package.json "type": "module"

    // Показывать детальный вывод
    verbose: true,

    // Очищать моки автоматически
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};