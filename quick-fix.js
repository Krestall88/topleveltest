const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function quickFix() {
  try {
    console.log('🔧 Исправляем проблему с входом...');

    // 1. Создаем .env.local файл
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const envContent = `JWT_SECRET="${jwtSecret}"\nDATABASE_URL="file:./dev.db"\n`;
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Создан .env.local файл');

    // 2. Удаляем всех пользователей и создаем админа
    await prisma.user.deleteMany({});
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Администратор',
        email: 'admin@cleaning.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('✅ Создан администратор');
    console.log('📧 Email: admin@cleaning.com');
    console.log('🔑 Пароль: admin123');
    console.log('\n⚠️ Перезапустите сервер: Ctrl+C, затем npm run dev');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickFix();
