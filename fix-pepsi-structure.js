const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPepsiStructure() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ СТРУКТУРЫ ОБЪЕКТА ПЕПСИ');
    console.log('====================================\n');

    // Находим объект Пепси
    const pepsiObject = await prisma.cleaningObject.findFirst({
      where: { name: 'ООО «ПепсиКо Холдингс»' },
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: {
                      include: {
                        techCards: true,
                        cleaningObjects: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!pepsiObject) {
      console.log('❌ Объект Пепси не найден');
      return;
    }

    console.log(`🏭 Обрабатываем объект: ${pepsiObject.name}`);

    let processedRooms = 0;
    let createdCleaningObjects = 0;
    let updatedTechCards = 0;

    // Обрабатываем каждое помещение
    for (const site of pepsiObject.sites) {
      for (const zone of site.zones) {
        for (const roomGroup of zone.roomGroups) {
          for (const room of roomGroup.rooms) {
            console.log(`\n🏠 Обрабатываем помещение: ${room.name}`);
            
            // Группируем техкарты по типам объектов уборки
            const techCardGroups = {};
            
            room.techCards.forEach(techCard => {
              // Определяем объект уборки на основе названия техкарты
              let cleaningObjectName = 'Общие работы';
              
              if (techCard.name.includes('пол')) {
                cleaningObjectName = 'Полы';
              } else if (techCard.name.includes('стен')) {
                cleaningObjectName = 'Стены';
              } else if (techCard.name.includes('окн') || techCard.name.includes('стекл')) {
                cleaningObjectName = 'Окна и стеклопакеты';
              } else if (techCard.name.includes('двер') || techCard.name.includes('ворот')) {
                cleaningObjectName = 'Двери и ворота';
              } else if (techCard.name.includes('мусор') || techCard.name.includes('корзин')) {
                cleaningObjectName = 'Мусорные контейнеры';
              } else if (techCard.name.includes('сантех') || techCard.name.includes('унитаз') || techCard.name.includes('раковин')) {
                cleaningObjectName = 'Сантехника';
              } else if (techCard.name.includes('мебел') || techCard.name.includes('стол') || techCard.name.includes('стул')) {
                cleaningObjectName = 'Мебель';
              } else if (techCard.name.includes('оборудован') || techCard.name.includes('аппарат')) {
                cleaningObjectName = 'Оборудование';
              } else if (techCard.name.includes('инвентар')) {
                cleaningObjectName = 'Инвентарь';
              } else if (techCard.name.includes('территор') || techCard.name.includes('снег') || techCard.name.includes('газон')) {
                cleaningObjectName = 'Территория';
              } else if (techCard.name.includes('лестниц') || techCard.name.includes('платформ')) {
                cleaningObjectName = 'Лестницы и платформы';
              } else if (techCard.name.includes('вентиляц')) {
                cleaningObjectName = 'Вентиляция';
              } else if (techCard.name.includes('освещен') || techCard.name.includes('плафон')) {
                cleaningObjectName = 'Освещение';
              }
              
              if (!techCardGroups[cleaningObjectName]) {
                techCardGroups[cleaningObjectName] = [];
              }
              techCardGroups[cleaningObjectName].push(techCard);
            });

            // Создаем объекты уборки для каждой группы
            for (const [cleaningObjectName, techCards] of Object.entries(techCardGroups)) {
              console.log(`  📋 Создаем объект уборки: ${cleaningObjectName} (${techCards.length} техкарт)`);
              
              // Проверяем, есть ли уже такой объект уборки
              let cleaningObjectItem = await prisma.cleaningObjectItem.findFirst({
                where: {
                  roomId: room.id,
                  name: cleaningObjectName
                }
              });

              if (!cleaningObjectItem) {
                // Создаем новый объект уборки
                cleaningObjectItem = await prisma.cleaningObjectItem.create({
                  data: {
                    name: cleaningObjectName,
                    description: `Объект уборки "${cleaningObjectName}" в помещении "${room.name}"`,
                    roomId: room.id
                  }
                });
                createdCleaningObjects++;
              }

              // Привязываем техкарты к объекту уборки
              for (const techCard of techCards) {
                await prisma.techCard.update({
                  where: { id: techCard.id },
                  data: {
                    cleaningObjectItemId: cleaningObjectItem.id
                  }
                });
                updatedTechCards++;
              }
            }

            processedRooms++;
          }
        }
      }
    }

    console.log(`\n📊 РЕЗУЛЬТАТЫ ИСПРАВЛЕНИЯ:`);
    console.log(`=========================`);
    console.log(`🏠 Обработано помещений: ${processedRooms}`);
    console.log(`📋 Создано объектов уборки: ${createdCleaningObjects}`);
    console.log(`🔧 Обновлено техкарт: ${updatedTechCards}`);
    console.log(`\n✅ Структура Пепси исправлена!`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении структуры:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPepsiStructure();
