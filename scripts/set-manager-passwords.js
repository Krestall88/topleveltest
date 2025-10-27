const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setManagerPasswords() {
  try {
    console.log('🔐 Установка паролей для всех менеджеров...\n');
    
    const standardPassword = 'manager123';
    console.log(`🔑 Стандартный пароль: ${standardPassword}\n`);
    
    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(standardPassword, salt);
    
    // Получаем всех менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true }
    });
    
    console.log(`📋 Найдено менеджеров: ${managers.length}\n`);
    
    let updatedCount = 0;
    
    for (const manager of managers) {
      try {
        await prisma.user.update({
          where: { id: manager.id },
          data: { password: hashedPassword }
        });
        
        console.log(`✅ ${manager.name} (${manager.email}) - пароль обновлен`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Ошибка обновления ${manager.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Готово! Обновлено паролей: ${updatedCount} из ${managers.length}`);
    console.log(`\n📝 Теперь все менеджеры могут войти с паролем: ${standardPassword}`);
    
    // Тестируем несколько менеджеров
    console.log('\n🧪 Тестирование входа...');
    const testManagers = managers.slice(0, 3);
    
    for (const manager of testManagers) {
      const updatedManager = await prisma.user.findUnique({
        where: { id: manager.id },
        select: { password: true }
      });
      
      const isValid = await bcrypt.compare(standardPassword, updatedManager.password);
      console.log(`🔑 ${manager.name}: ${isValid ? '✅ Пароль работает' : '❌ Ошибка пароля'}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setManagerPasswords();
