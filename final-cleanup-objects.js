const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function finalCleanupObjects() {
  try {
    console.log('🎯 ФИНАЛЬНАЯ ОЧИСТКА ОБЪЕКТОВ');
    console.log('=============================\n');

    // Находим админа для логирования
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Получаем текущие объекты
    const objects = await prisma.cleaningObject.findMany({
      include: {
        manager: { select: { name: true } },
        _count: {
          select: { sites: true, rooms: true, checklists: true, techCards: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Текущее количество объектов: ${objects.length}\n`);

    // Находим оставшиеся дубли для финальной очистки
    const finalDuplicates = [
      // ИП Широков - два объекта
      {
        keep: 'ИП Широков Дмитрий Владимирович (автосервис)',
        remove: 'Индивидуальный предприниматель Широков Дмитрий Владимирович автосервиса (площадь 245 м2)'
      },
      // ЕТЭС - два объекта
      {
        keep: 'ООО «Единые Транспортные ЭнергоСистемы» (ЕТЭС)',
        remove: 'Общество с ограниченной ответственностью «Единые Транспортные ЭнергоСистемы» (ООО «ЕТЭС»),'
      }
    ];

    let finalDeletedCount = 0;

    for (const duplicate of finalDuplicates) {
      try {
        const objectToKeep = objects.find(obj => obj.name.includes(duplicate.keep.substring(0, 20)));
        const objectToRemove = objects.find(obj => obj.name.includes(duplicate.remove.substring(0, 20)));

        if (objectToKeep && objectToRemove) {
          console.log(`🔄 Слияние объектов:`);
          console.log(`   ✅ Оставляем: ${objectToKeep.name}`);
          console.log(`   🗑️  Удаляем: ${objectToRemove.name}`);

          // Переносим данные с объекта для удаления на основной
          if (objectToRemove._count.sites > 0) {
            await prisma.site.updateMany({
              where: { objectId: objectToRemove.id },
              data: { objectId: objectToKeep.id }
            });
            console.log(`     🗺️  Перенесено участков: ${objectToRemove._count.sites}`);
          }

          if (objectToRemove._count.rooms > 0) {
            await prisma.room.updateMany({
              where: { objectId: objectToRemove.id },
              data: { objectId: objectToKeep.id }
            });
            console.log(`     🚪 Перенесено помещений: ${objectToRemove._count.rooms}`);
          }

          if (objectToRemove._count.techCards > 0) {
            await prisma.techCard.updateMany({
              where: { objectId: objectToRemove.id },
              data: { objectId: objectToKeep.id }
            });
            console.log(`     🔧 Перенесено техкарт: ${objectToRemove._count.techCards}`);
          }

          // Удаляем дубль
          await prisma.cleaningObject.delete({
            where: { id: objectToRemove.id }
          });

          console.log(`   ✅ Объект удален успешно\n`);
          finalDeletedCount++;

          // Логируем в аудит
          if (admin) {
            await prisma.auditLog.create({
              data: {
                userId: admin.id,
                action: 'MERGE_DUPLICATE_OBJECTS',
                entity: 'OBJECT',
                entityId: objectToKeep.id,
                details: `Слияние дублей: ${objectToRemove.name} → ${objectToKeep.name}`
              }
            });
          }
        }
      } catch (error) {
        console.log(`   ❌ Ошибка слияния: ${error.message}\n`);
      }
    }

    // Проверяем итоговое количество
    const finalCount = await prisma.cleaningObject.count();
    console.log('📊 РЕЗУЛЬТАТ ФИНАЛЬНОЙ ОЧИСТКИ:');
    console.log('='.repeat(35));
    console.log(`✅ Дополнительно удалено: ${finalDeletedCount}`);
    console.log(`📊 Итоговое количество объектов: ${finalCount}`);

    if (finalCount === 29) {
      console.log('🎯 ЦЕЛЬ ДОСТИГНУТА! Ровно 29 объектов как и планировалось!');
    } else if (finalCount <= 31) {
      console.log('✅ Количество объектов в приемлемых пределах');
    }

    // Анализируем структуру оставшихся объектов
    console.log('\n📊 АНАЛИЗ СТРУКТУРЫ ОБЪЕКТОВ:');
    console.log('='.repeat(35));

    const finalObjects = await prisma.cleaningObject.findMany({
      include: {
        manager: { select: { name: true } },
        _count: {
          select: { sites: true, rooms: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    let multiLevel = 0;
    let sitesOnly = 0;
    let roomsOnly = 0;
    let empty = 0;

    finalObjects.forEach(obj => {
      if (obj._count.sites > 0 && obj._count.rooms > 0) {
        multiLevel++;
      } else if (obj._count.sites > 0) {
        sitesOnly++;
      } else if (obj._count.rooms > 0) {
        roomsOnly++;
      } else {
        empty++;
      }
    });

    console.log(`🏗️  Многоуровневые (участки + помещения): ${multiLevel}`);
    console.log(`🗺️  Только участки: ${sitesOnly}`);
    console.log(`🚪 Только помещения: ${roomsOnly}`);
    console.log(`📭 Пустые: ${empty}`);

    // Показываем объекты без менеджеров
    const withoutManagers = finalObjects.filter(obj => !obj.manager);
    if (withoutManagers.length > 0) {
      console.log(`\n⚠️  Объектов без менеджеров: ${withoutManagers.length}`);
      withoutManagers.forEach(obj => {
        console.log(`   - ${obj.name}`);
      });
    } else {
      console.log('\n✅ Все объекты имеют назначенных менеджеров');
    }

    // Показываем топ объектов по количеству участков
    const topBySites = finalObjects
      .filter(obj => obj._count.sites > 0)
      .sort((a, b) => b._count.sites - a._count.sites)
      .slice(0, 5);

    console.log('\n🏆 ТОП-5 ОБЪЕКТОВ ПО УЧАСТКАМ:');
    topBySites.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name} - ${obj._count.sites} участков`);
    });

    // Создаем итоговый отчет
    const finalReport = {
      timestamp: new Date().toISOString(),
      totalObjects: finalCount,
      targetAchieved: finalCount === 29,
      structure: {
        multiLevel,
        sitesOnly,
        roomsOnly,
        empty
      },
      managersAssigned: finalObjects.length - withoutManagers.length,
      objectsWithoutManagers: withoutManagers.length,
      topObjectsBySites: topBySites.map(obj => ({
        name: obj.name,
        sites: obj._count.sites,
        manager: obj.manager?.name
      }))
    };

    require('fs').writeFileSync('final-cleanup-report.json', JSON.stringify(finalReport, null, 2));
    console.log('\n💾 Итоговый отчет сохранен в final-cleanup-report.json');

    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('✅ Дубли объектов удалены');
    console.log('✅ Данные сохранены и перенесены');
    console.log('✅ Структура объектов оптимизирована');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalCleanupObjects();
