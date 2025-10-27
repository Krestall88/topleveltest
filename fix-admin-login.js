const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function fixAdminLogin() {
  try {
    console.log('🔧 Исправляем админа для входа в систему...\n');
    
    // Проверяем, есть ли админ с правильным email
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });
    
    if (!admin) {
      console.log('❌ Админ admin@cleaning.com не найден');
      
      // Проверяем, есть ли admin@example.com
      const testAdmin = await prisma.user.findUnique({
        where: { email: 'admin@example.com' }
      });
      
      if (testAdmin) {
        console.log('🔄 Обновляем email тестового админа...');
        admin = await prisma.user.update({
          where: { id: testAdmin.id },
          data: {
            email: 'admin@cleaning.com',
            name: 'Администратор',
            password: await bcrypt.hash('admin123', 10)
          }
        });
        console.log('✅ Email админа обновлен с admin@example.com на admin@cleaning.com');
      } else {
        console.log('📝 Создаем нового админа...');
        admin = await prisma.user.create({
          data: {
            email: 'admin@cleaning.com',
            password: await bcrypt.hash('admin123', 10),
            name: 'Администратор',
            role: 'ADMIN'
          }
        });
        console.log('✅ Новый админ создан');
      }
    } else {
      console.log('✅ Админ admin@cleaning.com найден');
      
      // Обновляем пароль на всякий случай
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          password: await bcrypt.hash('admin123', 10)
        }
      });
      console.log('🔒 Пароль админа обновлен');
    }
    
    console.log('\n📋 Данные для входа:');
    console.log('Email: admin@cleaning.com');
    console.log('Пароль: admin123');
    
    // Проверяем API route для входа
    console.log('\n🔍 Проверяем API route...');
    const fs = require('fs');
    const loginRoutePath = 'src/app/api/auth/login/route.ts';
    
    if (fs.existsSync(loginRoutePath)) {
      console.log('✅ API route для входа существует: ' + loginRoutePath);
    } else {
      console.log('❌ API route для входа НЕ найден: ' + loginRoutePath);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminLogin();
