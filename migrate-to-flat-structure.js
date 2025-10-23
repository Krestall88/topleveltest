const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToFlatStructure() {
  try {
    console.log('🔄 МИГРАЦИЯ ДАННЫХ В ПЛОСКУЮ СТРУКТУРУ');
    console.log('====================================\n');

    // Очищаем существующие данные в плоской таблице
    await prisma.objectStructure.deleteMany({});
    console.log('🗑️ Очищена таблица ObjectStructure\n');

    // Получаем все данные из иерархической структуры
    const objects = await prisma.cleaningObject.findMany({
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: {
                      include: {
                        cleaningObjects: {
                          include: {
                            techCards: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        techCards: {
          include: {
            room: {
              include: {
                roomGroup: {
                  include: {
                    zone: {
                      include: {
                        site: true
                      }
                    }
                  }
                }
              }
            },
            cleaningObjectItem: true
          }
        }
      }
    });

    console.log(`📊 Найдено объектов: ${objects.length}`);

    let totalMigrated = 0;
    const structureStats = {};

    for (const object of objects) {
      console.log(`\n🏢 Обрабатываем: ${object.name}`);
      
      let objectTechCards = 0;

      // Обрабатываем техкарты объекта
      for (const techCard of object.techCards) {
        try {
          // Определяем структуру записи
          const structureData = {
            objectName: object.name,
            objectAddress: object.address,
            techCardName: techCard.name,
            frequency: techCard.frequency,
            notes: techCard.notes,
            period: techCard.period,
            workType: techCard.workType,
            description: techCard.description,
            objectId: object.id,
            techCardId: techCard.id
          };

          // Добавляем данные из иерархии, если они есть
          if (techCard.room) {
            structureData.roomName = techCard.room.name;
            structureData.roomId = techCard.room.id;

            if (techCard.room.roomGroup) {
              structureData.roomGroupName = techCard.room.roomGroup.name;
              structureData.roomGroupId = techCard.room.roomGroup.id;

              if (techCard.room.roomGroup.zone) {
                structureData.zoneName = techCard.room.roomGroup.zone.name;
                structureData.zoneId = techCard.room.roomGroup.zone.id;

                if (techCard.room.roomGroup.zone.site) {
                  structureData.siteName = techCard.room.roomGroup.zone.site.name;
                  structureData.siteId = techCard.room.roomGroup.zone.site.id;
                }
              }
            }
          }

          if (techCard.cleaningObjectItem) {
            structureData.cleaningObjectName = techCard.cleaningObjectItem.name;
            structureData.cleaningObjectId = techCard.cleaningObjectItem.id;
          }

          // Создаем запись в плоской таблице
          await prisma.objectStructure.create({
            data: structureData
          });

          objectTechCards++;
          totalMigrated++;

          // Статистика структуры
          const structureKey = [
            'Объект',
            structureData.siteName ? 'Участок' : null,
            structureData.zoneName ? 'Зона' : null,
            structureData.roomGroupName ? 'Группа помещений' : null,
            structureData.roomName ? 'Помещение' : null,
            structureData.cleaningObjectName ? 'Объект уборки' : null,
            'Техкарта'
          ].filter(Boolean).join(' → ');

          if (!structureStats[structureKey]) {
            structureStats[structureKey] = 0;
          }
          structureStats[structureKey]++;

        } catch (error) {
          console.error(`❌ Ошибка при обработке техкарты ${techCard.name}:`, error.message);
        }
      }

      console.log(`   ✅ Мигрировано техкарт: ${objectTechCards}`);
    }

    console.log(`\n📈 РЕЗУЛЬТАТЫ МИГРАЦИИ:`);
    console.log(`=======================`);
    console.log(`✅ Всего мигрировано записей: ${totalMigrated}`);
    console.log(`📊 Обработано объектов: ${objects.length}\n`);

    console.log(`🏗️ СТАТИСТИКА ПО СТРУКТУРАМ:`);
    console.log(`============================`);
    
    Object.entries(structureStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([structure, count]) => {
        console.log(`${count.toString().padStart(4)} записей: ${structure}`);
      });

    console.log(`\n🎯 ГОТОВО! Плоская структура создана.`);
    console.log(`Теперь можно создавать динамическое дерево на основе заполненных полей.`);

  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToFlatStructure();
