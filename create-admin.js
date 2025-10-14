const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Создаем администратора...');

    // Сначала удаляем всех пользователей
    await prisma.user.deleteMany({});
    console.log('Очищена таблица пользователей');

    // Создаем администратора
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'Администратор',
        email: 'admin@cleaning.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log('Создан администратор:');
    console.log(`- Имя: ${admin.name}`);
    console.log(`- Email: ${admin.email}`);
    console.log(`- Роль: ${admin.role}`);
    console.log('- Пароль: admin123');

  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
