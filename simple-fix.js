const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const crypto = require('crypto');

async function simpleFix() {
  try {
    console.log('🔧 Простое исправление аутентификации...');

    // 1. Создаем .env.local
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const envContent = `JWT_SECRET="${jwtSecret}"\nDATABASE_URL="file:./dev.db"\n`;
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Файл .env.local создан');

    // 2. Инициализируем Prisma
    const prisma = new PrismaClient();
    
    // 3. Проверяем существующих пользователей
    const existingUsers = await prisma.user.findMany();
    console.log(`📊 Найдено пользователей: ${existingUsers.length}`);

    // 4. Создаем админа если его нет
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (!admin) {
      console.log('👤 Создаем администратора...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      admin = await prisma.user.create({
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ Администратор создан');
    } else {
      console.log('✅ Администратор уже существует');
    }

    // 5. Проверяем пароль
    const passwordCheck = await bcrypt.compare('admin123', admin.password);
    console.log(`🔐 Проверка пароля: ${passwordCheck ? 'OK' : 'ОШИБКА'}`);

    await prisma.$disconnect();

    console.log('\n🎯 Данные для входа:');
    console.log('Email: admin@cleaning.com');
    console.log('Пароль: admin123');
    console.log('\n⚠️ Перезапустите сервер!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

simpleFix();
