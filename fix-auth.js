const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function fixAuth() {
  try {
    // 1. Создаем .env.local с JWT секретом
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const envContent = `JWT_SECRET="${jwtSecret}"\nDATABASE_URL="file:./dev.db"\n`;
    fs.writeFileSync('.env.local', envContent);
    console.log('✓ Создан файл .env.local с JWT_SECRET');

    // 2. Очищаем таблицу пользователей
    await prisma.user.deleteMany({});
    console.log('✓ Очищена таблица пользователей');

    // 3. Создаем администратора
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Администратор',
        email: 'admin@cleaning.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('✓ Создан администратор:');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Пароль: admin123`);
    console.log(`  Роль: ${admin.role}`);

    console.log('\n🎉 Настройка завершена! Перезапустите сервер и попробуйте войти.');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuth();
