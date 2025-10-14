const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('🔧 Тестирование подключения к базе данных...');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к базе данных работает');
    
    // Проверяем модели
    console.log('\n📊 Проверка моделей:');
    
    try {
      const objectsCount = await prisma.cleaningObject.count();
      console.log(`✅ CleaningObject: ${objectsCount} записей`);
    } catch (e) {
      console.log('❌ CleaningObject:', e.message);
    }
    
    try {
      const bindingsCount = await prisma.clientBinding.count();
      console.log(`✅ ClientBinding: ${bindingsCount} записей`);
    } catch (e) {
      console.log('❌ ClientBinding:', e.message);
    }
    
    try {
      const tasksCount = await prisma.additionalTask.count();
      console.log(`✅ AdditionalTask: ${tasksCount} записей`);
    } catch (e) {
      console.log('❌ AdditionalTask:', e.message);
    }
    
    // Проверяем объекты с менеджерами
    console.log('\n🏢 Объекты с менеджерами:');
    const objectsWithManagers = await prisma.cleaningObject.findMany({
      where: {
        managerId: {
          not: null
        }
      },
      include: {
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 3
    });
    
    objectsWithManagers.forEach(obj => {
      console.log(`  📍 ${obj.name} → ${obj.manager?.name || 'Нет менеджера'}`);
    });
    
    console.log('\n✅ База данных готова к работе!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
