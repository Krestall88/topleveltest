const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function fixComplete() {
  try {
    console.log('🔧 Полное восстановление системы аутентификации...');

    // 1. Создаем .env.local с правильными настройками
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const envContent = `# Автоматически сгенерированные настройки
JWT_SECRET="${jwtSecret}"
DATABASE_URL="file:./dev.db"
`;
    
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Создан файл .env.local');

    // 2. Проверяем подключение к базе данных
    try {
      await prisma.$connect();
      console.log('✅ Подключение к базе данных успешно');
    } catch (dbError) {
      console.log('❌ Ошибка подключения к базе:', dbError.message);
      return;
    }

    // 3. Очищаем и создаем администратора
    await prisma.user.deleteMany({});
    console.log('🗑️ Очищена таблица пользователей');

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
    console.log(`   Email: ${admin.email}`);
    console.log(`   Пароль: admin123`);
    console.log(`   Роль: ${admin.role}`);

    // 4. Проверяем созданного пользователя
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (testUser) {
      const passwordCheck = await bcrypt.compare('admin123', testUser.password);
      console.log(`✅ Проверка пароля: ${passwordCheck ? 'УСПЕШНО' : 'ОШИБКА'}`);
    }

    console.log('\n🎉 Восстановление завершено!');
    console.log('📝 Данные для входа:');
    console.log('   Email: admin@cleaning.com');
    console.log('   Пароль: admin123');
    console.log('\n⚠️ Перезапустите сервер для применения изменений');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error('Стек:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

fixComplete();
