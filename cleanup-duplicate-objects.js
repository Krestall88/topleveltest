const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function cleanupDuplicateObjects() {
  try {
    console.log('🧹 ОЧИСТКА ДУБЛЕЙ ОБЪЕКТОВ');
    console.log('==========================\n');

    // Читаем план очистки
    const cleanupPlan = JSON.parse(fs.readFileSync('objects-cleanup-plan.json', 'utf8'));
    
    console.log(`📊 Объектов до очистки: ${cleanupPlan.totalObjects}`);
    console.log(`📊 Объектов к удалению: ${cleanupPlan.duplicatesToRemove.length}`);
    console.log(`📊 Ожидается после очистки: ${cleanupPlan.expectedAfterCleanup}\n`);

    // Находим админа для логирования
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    let deletedCount = 0;
    let mergedSites = 0;
    let mergedRooms = 0;
    let mergedChecklists = 0;
    let mergedTechCards = 0;

    for (const duplicateObj of cleanupPlan.duplicatesToRemove) {
      try {
        console.log(`🗑️  Удаление: ${duplicateObj.name}`);
        console.log(`   ID: ${duplicateObj.id}`);

        // Получаем полную информацию об объекте
        const objectToDelete = await prisma.cleaningObject.findUnique({
          where: { id: duplicateObj.id },
          include: {
            sites: true,
            rooms: true,
            checklists: true,
            techCards: true,
            manager: { select: { name: true } }
          }
        });

        if (!objectToDelete) {
          console.log(`   ⚠️  Объект уже удален или не найден`);
          continue;
        }

        // Ищем основной объект (куда переносить данные)
        const normalizedName = duplicateObj.name
          .toLowerCase()
          .replace(/[«»"']/g, '"')
          .replace(/\s+/g, ' ')
          .replace(/\d+[\.,]?\d*\s*(кв\.?\s*м|м²).*$/i, '')
          .replace(/\s*\(\s*.*?\s*\)\s*/g, '')
          .replace(/\s*-\s*.*$/g, '')
          .trim();

        // Находим основной объект для слияния
        const mainObject = await prisma.cleaningObject.findFirst({
          where: {
            AND: [
              { id: { not: duplicateObj.id } },
              {
                OR: [
                  { name: { contains: normalizedName.split(' ')[0], mode: 'insensitive' } },
                  { name: { contains: duplicateObj.name.split(' ')[0], mode: 'insensitive' } }
                ]
              }
            ]
          },
          include: {
            _count: {
              select: { sites: true, rooms: true, checklists: true, techCards: true }
            }
          }
        });

        if (mainObject) {
          console.log(`   🔄 Слияние с: ${mainObject.name}`);

          // Переносим участки (если у основного объекта их меньше)
          if (objectToDelete.sites.length > 0 && mainObject._count.sites < objectToDelete.sites.length) {
            const sitesUpdated = await prisma.site.updateMany({
              where: { objectId: duplicateObj.id },
              data: { objectId: mainObject.id }
            });
            console.log(`     🗺️  Перенесено участков: ${sitesUpdated.count}`);
            mergedSites += sitesUpdated.count;
          }

          // Переносим помещения (если у основного объекта их меньше)
          if (objectToDelete.rooms.length > 0 && mainObject._count.rooms < objectToDelete.rooms.length) {
            const roomsUpdated = await prisma.room.updateMany({
              where: { objectId: duplicateObj.id },
              data: { objectId: mainObject.id }
            });
            console.log(`     🚪 Перенесено помещений: ${roomsUpdated.count}`);
            mergedRooms += roomsUpdated.count;
          }

          // Переносим чек-листы
          if (objectToDelete.checklists.length > 0) {
            const checklistsUpdated = await prisma.checklist.updateMany({
              where: { objectId: duplicateObj.id },
              data: { objectId: mainObject.id }
            });
            console.log(`     📋 Перенесено чек-листов: ${checklistsUpdated.count}`);
            mergedChecklists += checklistsUpdated.count;
          }

          // Переносим техкарты
          if (objectToDelete.techCards.length > 0) {
            const techCardsUpdated = await prisma.techCard.updateMany({
              where: { objectId: duplicateObj.id },
              data: { objectId: mainObject.id }
            });
            console.log(`     🔧 Перенесено техкарт: ${techCardsUpdated.count}`);
            mergedTechCards += techCardsUpdated.count;
          }
        }

        // Удаляем объект (каскадное удаление очистит связанные данные)
        await prisma.cleaningObject.delete({
          where: { id: duplicateObj.id }
        });

        console.log(`   ✅ Удален успешно`);
        deletedCount++;

        // Логируем в аудит
        if (admin) {
          await prisma.auditLog.create({
            data: {
              userId: admin.id,
              action: 'DELETE_DUPLICATE_OBJECT',
              entity: 'OBJECT',
              entityId: duplicateObj.id,
              details: `Удален дубль объекта: ${duplicateObj.name}${mainObject ? ` (данные перенесены в ${mainObject.name})` : ''}`
            }
          });
        }

      } catch (error) {
        console.log(`   ❌ Ошибка удаления: ${error.message}`);
      }

      console.log('');
    }

    // Проверяем итоговое состояние
    const finalObjectsCount = await prisma.cleaningObject.count();
    
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(30));
    console.log(`✅ Удалено дублей: ${deletedCount}`);
    console.log(`🔄 Перенесено участков: ${mergedSites}`);
    console.log(`🔄 Перенесено помещений: ${mergedRooms}`);
    console.log(`🔄 Перенесено чек-листов: ${mergedChecklists}`);
    console.log(`🔄 Перенесено техкарт: ${mergedTechCards}`);
    console.log(`📊 Объектов осталось: ${finalObjectsCount}`);

    if (finalObjectsCount <= 31) {
      console.log('✅ Количество объектов приведено к норме!');
    } else {
      console.log(`⚠️  Все еще много объектов (ожидалось ≤31)`);
    }

    // Показываем оставшиеся объекты
    console.log('\n📋 ОСТАВШИЕСЯ ОБЪЕКТЫ:');
    console.log('='.repeat(40));

    const remainingObjects = await prisma.cleaningObject.findMany({
      include: {
        manager: { select: { name: true } },
        _count: {
          select: { sites: true, rooms: true, checklists: true, techCards: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    remainingObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   👤 Менеджер: ${obj.manager?.name || 'не назначен'}`);
      console.log(`   📊 Участки: ${obj._count.sites}, Помещения: ${obj._count.rooms}`);
      console.log(`   📋 Чек-листы: ${obj._count.checklists}, Техкарты: ${obj._count.techCards}`);
    });

    // Проверяем объекты без менеджеров
    const objectsWithoutManagers = remainingObjects.filter(obj => !obj.manager);
    if (objectsWithoutManagers.length > 0) {
      console.log(`\n⚠️  Объектов без менеджеров: ${objectsWithoutManagers.length}`);
      console.log('Рекомендуется назначить менеджеров на эти объекты.');
    }

    // Сохраняем отчет об очистке
    const cleanupReport = {
      timestamp: new Date().toISOString(),
      deletedObjects: deletedCount,
      mergedData: {
        sites: mergedSites,
        rooms: mergedRooms,
        checklists: mergedChecklists,
        techCards: mergedTechCards
      },
      finalObjectsCount: finalObjectsCount,
      remainingObjects: remainingObjects.map(obj => ({
        id: obj.id,
        name: obj.name,
        manager: obj.manager?.name,
        structure: {
          sites: obj._count.sites,
          rooms: obj._count.rooms,
          checklists: obj._count.checklists,
          techCards: obj._count.techCards
        }
      }))
    };

    fs.writeFileSync('cleanup-report.json', JSON.stringify(cleanupReport, null, 2));
    console.log('\n💾 Отчет об очистке сохранен в cleanup-report.json');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateObjects();
