const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    console.log('🔍 Проверка дублирования техкарт на объектах Юг-сервис...\n');

    // Получаем все объекты Юг-сервис
    const yugObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        address: true
      }
    });

    console.log(`📊 Найдено объектов Юг-сервис: ${yugObjects.length}\n`);

    for (const obj of yugObjects) {
      console.log(`\n🏢 Объект: ${obj.name}`);
      console.log(`   Адрес: ${obj.address}`);
      console.log(`   ID: ${obj.id}`);

      // Получаем все техкарты объекта
      const techCards = await prisma.techCard.findMany({
        where: {
          objectId: obj.id
        },
        select: {
          id: true,
          name: true,
          frequency: true,
          workType: true,
          roomId: true,
          room: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`   📋 Всего техкарт: ${techCards.length}`);

      // Группируем по имени для поиска дублей
      const grouped = {};
      techCards.forEach(tc => {
        const key = `${tc.name}|${tc.frequency}|${tc.roomId || 'no-room'}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(tc);
      });

      // Ищем дубли
      const duplicates = Object.entries(grouped).filter(([_, cards]) => cards.length > 1);

      if (duplicates.length > 0) {
        console.log(`\n   ⚠️  НАЙДЕНЫ ДУБЛИ (${duplicates.length} групп):`);
        
        duplicates.forEach(([key, cards]) => {
          const [name, frequency, roomId] = key.split('|');
          console.log(`\n   📌 "${name}" (${frequency})`);
          console.log(`      Помещение: ${cards[0].room?.name || 'Не указано'}`);
          console.log(`      Количество дублей: ${cards.length}`);
          cards.forEach((card, idx) => {
            console.log(`      ${idx + 1}. ID: ${card.id}`);
          });
        });
      } else {
        console.log('   ✅ Дублей не найдено');
      }

      // Проверяем материализованные задачи
      const tasks = await prisma.task.findMany({
        where: {
          objectName: obj.name,
          scheduledStart: {
            gte: new Date('2025-01-01')
          }
        },
        select: {
          id: true,
          description: true,
          scheduledStart: true,
          status: true
        },
        orderBy: {
          scheduledStart: 'desc'
        },
        take: 20
      });

      if (tasks.length > 0) {
        console.log(`\n   📅 Последние материализованные задачи (${tasks.length}):`);
        
        // Группируем задачи по описанию и дате
        const taskGroups = {};
        tasks.forEach(task => {
          const dateStr = task.scheduledStart?.toISOString().split('T')[0] || 'no-date';
          const key = `${task.description}|${dateStr}`;
          if (!taskGroups[key]) {
            taskGroups[key] = [];
          }
          taskGroups[key].push(task);
        });

        const taskDuplicates = Object.entries(taskGroups).filter(([_, tasks]) => tasks.length > 1);
        
        if (taskDuplicates.length > 0) {
          console.log(`\n   ⚠️  НАЙДЕНЫ ДУБЛИ ЗАДАЧ (${taskDuplicates.length} групп):`);
          taskDuplicates.forEach(([key, tasks]) => {
            const [desc, date] = key.split('|');
            console.log(`\n      📌 "${desc}" на ${date}`);
            console.log(`         Количество дублей: ${tasks.length}`);
            tasks.forEach((task, idx) => {
              console.log(`         ${idx + 1}. ID: ${task.id}, Статус: ${task.status}`);
            });
          });
        }
      }
    }

    console.log('\n✅ Проверка завершена');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
