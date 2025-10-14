const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSystem() {
  try {
    // Проверить объекты
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        requirePhotoForCompletion: true,
        requireCommentForCompletion: true
      },
      take: 5
    });

    console.log('📋 Объекты в системе:');
    objects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   - Фото: ${obj.requirePhotoForCompletion ? 'ДА' : 'НЕТ'}`);
      console.log(`   - Комментарий: ${obj.requireCommentForCompletion ? 'ДА' : 'НЕТ'}`);
    });

    // Проверить чек-листы
    const checklists = await prisma.checklist.findMany({
      include: {
        object: { select: { name: true } },
        room: { select: { name: true } },
        tasks: { select: { status: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n📝 Последние чек-листы:');
    checklists.forEach((checklist, index) => {
      const completed = checklist.tasks.filter(t => t.status === 'COMPLETED').length;
      const status = checklist.completedAt ? 'Завершен' : 'В работе';
      console.log(`${index + 1}. ${checklist.object.name} - ${status} (${completed}/${checklist.tasks.length})`);
    });

    console.log('\n🚀 Система готова к тестированию!');
    console.log('Откройте: http://localhost:3001');

  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystem();
