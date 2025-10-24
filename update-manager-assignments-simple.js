const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Упрощенные данные для тестирования
const testAssignments = [
  {
    objectName: 'УК Юг-сервис',
    managerName: 'Штельмашенко Ирина Николаевна'
  },
  {
    objectName: 'УК Юг-сервис', 
    managerName: 'Халидова Лилия Ильшатовна'
  },
  {
    objectName: 'ООО «Инкатех»',
    managerName: 'Нувальцева Мария Александровна'
  },
  {
    objectName: 'ЗАО  «СБКК»',
    managerName: 'Брагина Катерина Юрьевна'
  }
];

async function updateSimpleAssignments() {
  console.log('🔄 Обновляем назначения менеджеров (упрощенная версия)...\n');

  try {
    let processedCount = 0;

    for (const assignment of testAssignments) {
      try {
        // Найдем объект по части названия
        const object = await prisma.cleaningObject.findFirst({
          where: {
            name: {
              contains: assignment.objectName.split(' ')[0],
              mode: 'insensitive'
            }
          }
        });

        if (!object) {
          console.log(`❌ Объект не найден: "${assignment.objectName}"`);
          continue;
        }

        // Найдем менеджера по фамилии
        const manager = await prisma.user.findFirst({
          where: {
            name: {
              contains: assignment.managerName.split(' ')[0],
              mode: 'insensitive'
            },
            role: 'MANAGER'
          }
        });

        if (!manager) {
          console.log(`❌ Менеджер не найден: "${assignment.managerName}"`);
          continue;
        }

        // Назначаем менеджера на объект
        await prisma.cleaningObject.update({
          where: { id: object.id },
          data: { managerId: manager.id }
        });

        console.log(`✅ Назначен ${manager.name} на объект "${object.name}"`);
        processedCount++;

      } catch (error) {
        console.error(`❌ Ошибка при обработке ${assignment.objectName}:`, error.message);
      }
    }

    console.log(`\n📊 ИТОГИ: Обработано ${processedCount} из ${testAssignments.length} назначений`);

    // Проверим результат
    console.log('\n🔍 Проверяем назначения:');
    const managersWithObjects = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        name: true,
        _count: {
          select: {
            managedObjects: true,
            managedSites: true
          }
        }
      }
    });

    managersWithObjects.forEach(manager => {
      if (manager._count.managedObjects > 0 || manager._count.managedSites > 0) {
        console.log(`✅ ${manager.name}: ${manager._count.managedObjects} объектов, ${manager._count.managedSites} участков`);
      }
    });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSimpleAssignments();
