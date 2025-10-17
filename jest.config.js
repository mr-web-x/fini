export default {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/tests/unit/services/**/*.test.js'],
    collectCoverageFrom: [
        'services/userService.js',
        'services/articleService.js',
        'services/commentService.js'
    ],
    testTimeout: 10000,
    setupFilesAfterEnv: ['./tests/setup.js'],
    transform: {} // Отключаем babel, используем нативные ES modules
};