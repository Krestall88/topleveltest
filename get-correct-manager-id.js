const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getCorrectManagerId() {
  try {
    // Найдем менеджера с назначениями
    const manager = await prisma.user.findFirst({
      where: { 
        name: 'Штельмашенко Ирина Николаевна',
        role: 'MANAGER'
      }
    });

    if (manager) {
      console.log(`✅ ID менеджера "Штельмашенко Ирина Николаевна": ${manager.id}`);
      console.log(`🔗 Тестовый URL: http://localhost:3002/api/managers/${manager.id}/details`);
      
      // Проверим, что у неё есть назначения
      const objectsCount = await prisma.cleaningObject.count({
        where: { managerId: manager.id }
      });
      
      const sitesCount = await prisma.site.count({
        where: { managerId: manager.id }
      });
      
      console.log(`📊 Объектов: ${objectsCount}, Участков: ${sitesCount}`);
      
    } else {
      console.log('❌ Менеджер не найден');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCorrectManagerId();
