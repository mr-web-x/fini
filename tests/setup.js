import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

// Перед всеми тестами - запустить in-memory MongoDB
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✅ Test DB connected');
});

// После каждого теста - очистить БД
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// После всех тестов - закрыть соединение
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('✅ Test DB disconnected');
});