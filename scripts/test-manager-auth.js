const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testManagerAuth() {
  try {
    console.log('🔐 Тестирование системы аутентификации менеджеров...\n');
    
    // Получаем несколько менеджеров для тестирования
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true, password: true },
      take: 5
    });
    
    console.log(`📋 Найдено менеджеров для тестирования: ${managers.length}\n`);
    
    // Тестируем каждого менеджера
    for (const manager of managers) {
      console.log(`👤 Тестируем: ${manager.name}`);
      console.log(`📧 Email: ${manager.email}`);
      
      // Проверяем, что пароль захеширован
      const isHashed = manager.password.startsWith('$2');
      console.log(`🔐 Пароль захеширован: ${isHashed ? '✅' : '❌'}`);
      
      if (isHashed) {
        // Тестируем стандартный пароль для менеджеров
        const testPassword = 'manager123';
        const isPasswordValid = await bcrypt.compare(testPassword, manager.password);
        console.log(`🔑 Стандартный пароль 'manager123' работает: ${isPasswordValid ? '✅' : '❌'}`);
        
        if (!isPasswordValid) {
          // Проверим другие возможные пароли
          const otherPasswords = ['password', '123456', 'admin123'];
          for (const pwd of otherPasswords) {
            const valid = await bcrypt.compare(pwd, manager.password);
            if (valid) {
              console.log(`🔑 Найден рабочий пароль: '${pwd}' ✅`);
              break;
            }
          }
        }
      }
      
      console.log('---');
    }
    
    // Проверяем настройки JWT
    console.log('\n🔧 Проверка конфигурации:');
    console.log(`JWT_SECRET установлен: ${process.env.JWT_SECRET ? '✅' : '❌'}`);
    
    // Проверяем структуру базы данных
    const userCount = await prisma.user.count();
    const managerCount = await prisma.user.count({ where: { role: 'MANAGER' } });
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    
    console.log(`\n📊 Статистика пользователей:`);
    console.log(`Всего пользователей: ${userCount}`);
    console.log(`Менеджеров: ${managerCount}`);
    console.log(`Администраторов: ${adminCount}`);
    
    console.log('\n✅ Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testManagerAuth();
