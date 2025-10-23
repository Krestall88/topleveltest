const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignManagersToObjectsAndSites() {
  try {
    console.log('👥 НАЗНАЧЕНИЕ МЕНЕДЖЕРОВ НА ОБЪЕКТЫ И УЧАСТКИ');
    console.log('=============================================\n');

    // Находим админа для логирования
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Получаем всех менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true }
    });

    console.log(`👤 Найдено менеджеров: ${managers.length}\n`);

    // Назначения согласно списку (объект → менеджер)
    const assignments = [
      { objectPattern: 'Альфа', managerPattern: 'Ягода Ирина' },
      { objectPattern: 'Электрощит', managerPattern: 'Гайнуллина Айна' },
      { objectPattern: 'ПепсиКо', managerPattern: 'Исайчева Маргарита' },
      { objectPattern: 'СБКК', managerPattern: 'Брагина Катерина' },
      { objectPattern: 'Самараэнерго', managerPattern: 'Гайнуллина Айна' },
      { objectPattern: 'ТЯЖМАШ', managerPattern: 'Васекин Александр' },
      { objectPattern: 'БыстроБанк', managerPattern: 'Пленкина Наталья' },
      { objectPattern: 'Хлебозавод', managerPattern: 'Будкова Светлана' },
      { objectPattern: 'Маркет', managerPattern: 'Соколова Ольга' },
      { objectPattern: 'Яндекс', managerPattern: 'Тимохина Анна' },
      { objectPattern: 'Сфера', managerPattern: 'Халидова Лилия' },
      { objectPattern: 'Экран', managerPattern: 'Крапивко Лариса' },
      { objectPattern: 'Нектар', managerPattern: 'Бобровская Елена' },
      { objectPattern: 'Континент', managerPattern: 'Штельмашенко Ирина' },
      { objectPattern: 'ЕТЭС', managerPattern: 'Напольская Людмила' },
      { objectPattern: 'Желдорпроект', managerPattern: 'Ласкин Павел' },
      { objectPattern: 'Медицина', managerPattern: 'Кобзева Анна' },
      { objectPattern: 'СамГМУ', managerPattern: 'Нувальцева Мария' },
      { objectPattern: 'Спартак', managerPattern: 'Галиев Рустам' },
      { objectPattern: 'Лопатинское', managerPattern: 'Гордеев Роман' }
    ];

    let assignedObjects = 0;
    let assignedSites = 0;

    for (const assignment of assignments) {
      try {
        // Находим менеджера
        const manager = managers.find(m => 
          m.name.toLowerCase().includes(assignment.managerPattern.toLowerCase())
        );

        if (!manager) {
          console.log(`❌ Менеджер не найден: ${assignment.managerPattern}`);
          continue;
        }

        // Находим объекты по паттерну
        const objects = await prisma.cleaningObject.findMany({
          where: {
            name: {
              contains: assignment.objectPattern,
              mode: 'insensitive'
            }
          },
          include: {
            sites: true,
            manager: { select: { name: true } }
          }
        });

        if (objects.length === 0) {
          console.log(`⚠️  Объекты не найдены для паттерна: ${assignment.objectPattern}`);
          continue;
        }

        console.log(`\n🎯 Назначение ${manager.name} на объекты с паттерном "${assignment.objectPattern}"`);
        console.log(`   Найдено объектов: ${objects.length}`);

        for (const object of objects) {
          try {
            // Назначаем менеджера на объект (если еще не назначен)
            if (object.managerId !== manager.id) {
              await prisma.cleaningObject.update({
                where: { id: object.id },
                data: { managerId: manager.id }
              });

              console.log(`   ✅ Объект: ${object.name}`);
              console.log(`      👤 Назначен менеджер: ${manager.name}`);

              // Логируем в аудит
              if (admin) {
                await prisma.auditLog.create({
                  data: {
                    userId: admin.id,
                    action: 'ASSIGN_OBJECT_MANAGER',
                    entity: 'OBJECT',
                    entityId: object.id,
                    details: `Назначен менеджер ${manager.name} на объект ${object.name}`
                  }
                });
              }

              assignedObjects++;
            } else {
              console.log(`   ⏭️  Объект: ${object.name} (уже назначен ${object.manager?.name})`);
            }

            // Назначаем менеджера на все участки этого объекта
            if (object.sites.length > 0) {
              const sitesUpdated = await prisma.site.updateMany({
                where: {
                  objectId: object.id,
                  managerId: { not: manager.id }
                },
                data: { managerId: manager.id }
              });

              if (sitesUpdated.count > 0) {
                console.log(`      🗺️  Назначен на ${sitesUpdated.count} участков`);
                assignedSites += sitesUpdated.count;

                // Логируем в аудит для участков
                if (admin) {
                  await prisma.auditLog.create({
                    data: {
                      userId: admin.id,
                      action: 'ASSIGN_SITE_MANAGER',
                      entity: 'SITE',
                      entityId: object.id,
                      details: `Назначен менеджер ${manager.name} на ${sitesUpdated.count} участков объекта ${object.name}`
                    }
                  });
                }
              }
            }

          } catch (error) {
            console.log(`   ❌ Ошибка назначения на объект ${object.name}: ${error.message}`);
          }
        }

      } catch (error) {
        console.log(`❌ Ошибка обработки назначения ${assignment.objectPattern} → ${assignment.managerPattern}: ${error.message}`);
      }
    }

    // Назначаем оставшихся менеджеров на объекты без менеджеров
    console.log('\n🔄 НАЗНАЧЕНИЕ НА ОБЪЕКТЫ БЕЗ МЕНЕДЖЕРОВ:');
    console.log('=' .repeat(40));

    const objectsWithoutManagers = await prisma.cleaningObject.findMany({
      where: { managerId: null },
      include: { sites: true }
    });

    console.log(`📋 Объектов без менеджеров: ${objectsWithoutManagers.length}`);

    if (objectsWithoutManagers.length > 0) {
      // Распределяем равномерно между менеджерами
      for (let i = 0; i < objectsWithoutManagers.length; i++) {
        const object = objectsWithoutManagers[i];
        const manager = managers[i % managers.length];

        try {
          await prisma.cleaningObject.update({
            where: { id: object.id },
            data: { managerId: manager.id }
          });

          console.log(`✅ ${object.name} → ${manager.name}`);

          // Назначаем на участки
          if (object.sites.length > 0) {
            await prisma.site.updateMany({
              where: { objectId: object.id },
              data: { managerId: manager.id }
            });
            console.log(`   🗺️  Назначен на ${object.sites.length} участков`);
            assignedSites += object.sites.length;
          }

          assignedObjects++;

          // Логируем в аудит
          if (admin) {
            await prisma.auditLog.create({
              data: {
                userId: admin.id,
                action: 'ASSIGN_OBJECT_MANAGER',
                entity: 'OBJECT',
                entityId: object.id,
                details: `Автоматически назначен менеджер ${manager.name} на объект ${object.name}`
              }
            });
          }

        } catch (error) {
          console.log(`❌ Ошибка назначения ${object.name}: ${error.message}`);
        }
      }
    }

    // Итоговая статистика
    console.log('\n' + '='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА НАЗНАЧЕНИЙ:');
    console.log('='.repeat(50));
    console.log(`✅ Назначено менеджеров на объекты: ${assignedObjects}`);
    console.log(`🗺️  Назначено менеджеров на участки: ${assignedSites}`);

    // Показываем статистику по менеджерам
    const managerStats = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      include: {
        _count: {
          select: {
            managedObjects: true,
            managedSites: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n👥 СТАТИСТИКА ПО МЕНЕДЖЕРАМ (${managerStats.length}):`);
    managerStats.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   🏢 Объектов: ${manager._count.managedObjects}`);
      console.log(`   🗺️  Участков: ${manager._count.managedSites}`);
    });

    // Проверяем объекты без менеджеров
    const remainingWithoutManagers = await prisma.cleaningObject.count({
      where: { managerId: null }
    });

    console.log(`\n⚠️  Объектов без менеджеров: ${remainingWithoutManagers}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignManagersToObjectsAndSites();
