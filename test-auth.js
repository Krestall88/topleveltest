const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔍 Проверяем состояние базы данных...');

    // Проверяем подключение к базе
    const userCount = await prisma.user.count();
    console.log(`Пользователей в базе: ${userCount}`);

    // Получаем всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true
      }
    });

    console.log('\nПользователи в базе:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
      console.log(`  Пароль хеш: ${user.password.substring(0, 20)}...`);
    });

    // Тестируем пароль админа
    const admin = users.find(u => u.email === 'admin@cleaning.com');
    if (admin) {
      const isValid = await bcrypt.compare('admin123', admin.password);
      console.log(`\n✅ Проверка пароля админа: ${isValid ? 'УСПЕШНО' : 'ОШИБКА'}`);
    } else {
      console.log('\n❌ Администратор не найден');
    }

    // Проверяем переменные окружения
    console.log('\n🔧 Переменные окружения:');
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'установлен' : 'НЕ УСТАНОВЛЕН'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'установлен' : 'НЕ УСТАНОВЛЕН'}`);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
