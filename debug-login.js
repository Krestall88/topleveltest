const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const prisma = new PrismaClient();

async function debugLogin() {
  try {
    console.log('🔍 Диагностика проблемы входа...');

    // 1. Проверяем .env.local файл
    if (fs.existsSync('.env.local')) {
      const envContent = fs.readFileSync('.env.local', 'utf8');
      console.log('✅ Файл .env.local существует');
      console.log('Содержимое:', envContent.split('\n').map(line => 
        line.startsWith('JWT_SECRET=') ? 'JWT_SECRET=[СКРЫТ]' : line
      ).join('\n'));
    } else {
      console.log('❌ Файл .env.local НЕ НАЙДЕН');
    }

    // 2. Проверяем базу данных
    const users = await prisma.user.findMany();
    console.log(`\n📊 Пользователей в базе: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ База данных пуста, создаем администратора...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      
      console.log('✅ Администратор создан');
    } else {
      console.log('Пользователи:');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role})`);
      });
    }

    // 3. Тестируем вход
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (testUser) {
      const passwordMatch = await bcrypt.compare('admin123', testUser.password);
      console.log(`\n🔐 Проверка пароля: ${passwordMatch ? '✅ УСПЕШНО' : '❌ ОШИБКА'}`);
    }

    console.log('\n🎯 Попробуйте войти с данными:');
    console.log('Email: admin@cleaning.com');
    console.log('Пароль: admin123');

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugLogin();
