/**
 * Тестирование системы авторизации
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testAuthSystem() {
  try {
    console.log('🧪 Тестирование системы авторизации...');

    // Проверяем существующих пользователей
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });

    console.log(`📊 Найдено пользователей: ${users.length}`);
    
    users.forEach(user => {
      console.log(`👤 ${user.name} (${user.email}) - ${user.role}`);
    });

    // Проверяем, есть ли админ
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('⚠️ Админ не найден, создаем...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await prisma.user.create({
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      
      console.log(`✅ Создан админ: ${newAdmin.name} (${newAdmin.email})`);
    }

    // Проверяем, есть ли бухгалтер
    const accountant = await prisma.user.findFirst({
      where: { role: 'ACCOUNTANT' }
    });

    if (!accountant) {
      console.log('⚠️ Бухгалтер не найден, создаем...');
      
      const hashedPassword = await bcrypt.hash('accountant123', 10);
      
      const newAccountant = await prisma.user.create({
        data: {
          name: 'Бухгалтер',
          email: 'accountant@cleaning.com',
          password: hashedPassword,
          role: 'ACCOUNTANT'
        }
      });
      
      console.log(`✅ Создан бухгалтер: ${newAccountant.name} (${newAccountant.email})`);
    }

    // Проверяем, есть ли заместитель
    const deputy = await prisma.user.findFirst({
      where: { role: 'DEPUTY' }
    });

    if (!deputy) {
      console.log('⚠️ Заместитель не найден, создаем...');
      
      const hashedPassword = await bcrypt.hash('deputy123', 10);
      
      const newDeputy = await prisma.user.create({
        data: {
          name: 'Заместитель',
          email: 'deputy@cleaning.com',
          password: hashedPassword,
          role: 'DEPUTY'
        }
      });
      
      console.log(`✅ Создан заместитель: ${newDeputy.name} (${newDeputy.email})`);
    }

    console.log('\n🎉 Система авторизации готова!');
    console.log('\n📋 Данные для входа:');
    console.log('👑 Администратор: admin@cleaning.com / admin123');
    console.log('💰 Бухгалтер: accountant@cleaning.com / accountant123');
    console.log('👥 Заместитель: deputy@cleaning.com / deputy123');
    console.log('\n🌐 Откройте http://localhost:3000/auth/login');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthSystem();
