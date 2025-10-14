const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧹 Очистка дублирующих пользователей...');

    // Удаляем дублирующего админа
    const deleted = await prisma.user.deleteMany({
      where: { email: 'admin@example.com' }
    });

    console.log(`🗑️ Удалено пользователей: ${deleted.count}`);

    // Проверяем оставшихся пользователей
    const users = await prisma.user.findMany();
    console.log(`👥 Осталось пользователей: ${users.length}`);

    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Проверяем пароль основного админа
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (admin) {
      const passwordValid = await bcrypt.compare('admin123', admin.password);
      console.log(`🔐 Пароль admin123: ${passwordValid ? 'OK' : 'НЕВЕРНЫЙ'}`);
      
      if (!passwordValid) {
        console.log('🔧 Исправляем пароль...');
        const newHash = await bcrypt.hash('admin123', 10);
        await prisma.user.update({
          where: { id: admin.id },
          data: { password: newHash }
        });
        console.log('✅ Пароль исправлен');
      }
    }

    console.log('\n🎯 Данные для входа:');
    console.log('Email: admin@cleaning.com');
    console.log('Пароль: admin123');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
