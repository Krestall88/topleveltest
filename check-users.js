const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Проверяем пользователей в базе данных...');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    console.log(`Найдено пользователей: ${users.length}`);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role}`);
    });

    if (users.length === 0) {
      console.log('\nПользователи не найдены. Создаем администратора...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.user.create({
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      
      console.log('Создан администратор:', admin.name, admin.email);
    }

  } catch (error) {
    console.error('Ошибка при проверке пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
