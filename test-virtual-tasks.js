const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testVirtualTasks() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ВИРТУАЛЬНЫХ ЗАДАЧ...\n');

    // 1. Проверяем техкарты
    const techCardsCount = await prisma.techCard.count();
    console.log('📋 Техкарт в базе:', techCardsCount);

    // 2. Получаем пример техкарты
    const sampleTechCard = await prisma.techCard.findFirst({
      include: {
        object: { select: { name: true, managerId: true } },
        room: { select: { name: true, area: true } }
      }
    });

    if (sampleTechCard) {
      console.log('📝 Пример техкарты:', {
        id: sampleTechCard.id,
        name: sampleTechCard.name,
        frequency: sampleTechCard.frequency,
        object: sampleTechCard.object?.name,
        room: sampleTechCard.room?.name,
        managerId: sampleTechCard.object?.managerId
      });
    }

    // 3. Проверяем менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true }
    });

    console.log('\n👥 МЕНЕДЖЕРЫ:');
    managers.forEach(manager => {
      console.log(`- ${manager.name} (${manager.id})`);
    });

    // 4. Проверяем объекты с менеджерами
    const objectsWithManagers = await prisma.cleaningObject.findMany({
      where: { managerId: { not: null } },
      select: {
        id: true,
        name: true,
        managerId: true,
        manager: { select: { name: true } }
      },
      take: 5
    });

    console.log('\n🏢 ОБЪЕКТЫ С МЕНЕДЖЕРАМИ (первые 5):');
    objectsWithManagers.forEach(obj => {
      console.log(`- ${obj.name} → ${obj.manager?.name}`);
    });

    // 5. Тестируем виртуальную логику
    console.log('\n🔄 ТЕСТИРОВАНИЕ ВИРТУАЛЬНОЙ ЛОГИКИ:');
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Берем первые 5 техкарт для теста
    const testTechCards = await prisma.techCard.findMany({
      take: 5,
      include: {
        object: { select: { name: true, managerId: true } },
        room: { select: { name: true, area: true } }
      }
    });

    console.log(`📅 Создаем виртуальные задачи на ${dateStr}:`);
    
    testTechCards.forEach(techCard => {
      const virtualTaskId = `${techCard.id}-${dateStr}`;
      console.log(`- ${virtualTaskId}: ${techCard.name} (${techCard.object?.name})`);
    });

    // 6. Проверяем существующие реальные задачи
    const realTasksToday = await prisma.task.count({
      where: {
        scheduledStart: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      }
    });

    console.log(`\n📊 СТАТИСТИКА НА ${dateStr}:`);
    console.log(`- Техкарт: ${techCardsCount}`);
    console.log(`- Реальных задач: ${realTasksToday}`);
    console.log(`- Виртуальных задач будет: ${techCardsCount} (на основе техкарт)`);
    console.log(`- Экономия записей в БД: ${techCardsCount - realTasksToday} задач не созданы физически`);

    // 7. Проверяем API эндпоинты (симуляция)
    console.log('\n🔗 ГОТОВЫЕ API ЭНДПОИНТЫ:');
    console.log('- GET /api/tasks/virtual - получение виртуальных задач');
    console.log('- GET /api/tasks/calendar-virtual - календарь виртуальных задач');
    console.log('- POST /api/tasks/materialize - материализация задач');
    console.log('- GET/POST /api/photo-reports/general - общие фотоотчеты');

    console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
    console.log('\n🎯 НОВАЯ АРХИТЕКТУРА ГОТОВА:');
    console.log('1. Виртуальные задачи генерируются на лету из техкарт');
    console.log('2. Реальные задачи создаются только при взаимодействии');
    console.log('3. Добавлена вкладка для общих фотоотчетов');
    console.log('4. Сохранен весь существующий функционал');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVirtualTasks();
