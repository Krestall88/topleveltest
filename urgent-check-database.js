const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 СРОЧНАЯ ПРОВЕРКА БАЗЫ ДАННЫХ...\n');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');
    
    // Проверяем объекты
    const objectsCount = await prisma.cleaningObject.count();
    console.log(`📊 Всего объектов в базе: ${objectsCount}`);
    
    if (objectsCount > 0) {
      const objects = await prisma.cleaningObject.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });
      
      console.log('\n📋 Последние 10 объектов:');
      objects.forEach((obj, index) => {
        console.log(`${index + 1}. ${obj.name} (${obj.id}) - ${obj.createdAt}`);
      });
    }
    
    // Проверяем пользователей
    const usersCount = await prisma.user.count();
    console.log(`\n👥 Всего пользователей: ${usersCount}`);
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log('\n👤 Пользователи:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - ${user.createdAt}`);
    });
    
    // Проверяем структуры
    const structuresCount = await prisma.structure.count();
    console.log(`\n🏗️ Всего структур: ${structuresCount}`);
    
    // Проверяем задачи отчетности
    const reportingTasksCount = await prisma.reportingTask.count();
    console.log(`\n📝 Всего задач отчетности: ${reportingTasksCount}`);
    
    // Проверяем последние миграции
    console.log('\n🔄 Проверяем последние изменения в схеме...');
    
  } catch (error) {
    console.error('❌ ОШИБКА при проверке базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
