const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function diagnoseAuth() {
  try {
    console.log('🔍 Диагностика проблемы входа...');

    // 1. Проверяем .env.local
    if (fs.existsSync('.env.local')) {
      const envContent = fs.readFileSync('.env.local', 'utf8');
      console.log('✅ .env.local найден');
      const hasJWT = envContent.includes('JWT_SECRET=');
      console.log(`JWT_SECRET: ${hasJWT ? '✅ установлен' : '❌ отсутствует'}`);
    } else {
      console.log('❌ .env.local не найден');
    }

    // 2. Проверяем подключение к базе
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');

    // 3. Проверяем пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`📊 Пользователей в базе: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    // 4. Проверяем конкретного админа
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (admin) {
      console.log('✅ Администратор найден');
      const passwordTest = await bcrypt.compare('admin123', admin.password);
      console.log(`🔐 Пароль admin123: ${passwordTest ? '✅ верный' : '❌ неверный'}`);
    } else {
      console.log('❌ Администратор admin@cleaning.com не найден');
    }

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
    if (error.code) {
      console.error('Код ошибки:', error.code);
    }
  }
}

diagnoseAuth();
