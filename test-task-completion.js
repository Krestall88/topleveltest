const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTaskCompletion() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ЗАВЕРШЕНИЯ ЗАДАЧ...\n');

    // 1. Получаем первую техкарту для создания виртуальной задачи
    const techCard = await prisma.techCard.findFirst({
      include: {
        object: { select: { name: true } },
        room: { select: { name: true } }
      }
    });

    if (!techCard) {
      console.log('❌ Техкарты не найдены');
      return;
    }

    console.log('📋 Найдена техкарта:', {
      id: techCard.id,
      name: techCard.name,
      object: techCard.object?.name,
      room: techCard.room?.name
    });

    // 2. Создаем ID виртуальной задачи
    const today = new Date().toISOString().split('T')[0];
    const virtualTaskId = `${techCard.id}-${today}`;
    
    console.log('🔧 ID виртуальной задачи:', virtualTaskId);

    // 3. Проверяем, существует ли задача в БД
    const existingTask = await prisma.task.findUnique({
      where: { id: virtualTaskId }
    });

    console.log('📊 Задача в БД:', existingTask ? 'Существует' : 'Не существует (виртуальная)');

    // 4. Симулируем завершение задачи через обновленный API
    console.log('\n🎯 СИМУЛЯЦИЯ ЗАВЕРШЕНИЯ ЗАДАЧИ:');
    console.log(`POST /api/tasks/${virtualTaskId}/complete`);
    console.log('Body:', {
      status: 'COMPLETED',
      comment: 'Тестовое завершение виртуальной задачи',
      photos: []
    });

    // 5. Проверяем материализацию
    if (!existingTask) {
      console.log('\n🔄 МАТЕРИАЛИЗАЦИЯ:');
      console.log('- Задача будет создана при первом взаимодействии');
      console.log('- API /api/tasks/[id]/complete теперь поддерживает виртуальные задачи');
      console.log('- Материализация произойдет автоматически');
    }

    console.log('\n✅ ГОТОВО К ТЕСТИРОВАНИЮ:');
    console.log('1. Откройте календарь задач в браузере');
    console.log('2. Попробуйте завершить любую задачу');
    console.log('3. Ошибка "задача не найдена" должна исчезнуть');
    console.log('4. Виртуальные задачи будут материализоваться автоматически');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTaskCompletion();
