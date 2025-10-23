const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Проверяем данные в базе...\n');

    // Проверяем объекты
    const objects = await prisma.cleaningObject.findMany({
      include: {
        manager: true,
        rooms: {
          include: {
            techCards: true,
            cleaningObjects: {
              include: {
                techCards: true
              }
            }
          }
        },
        techCards: true,
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: {
                      include: {
                        techCards: true,
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
        }
      }
    });

    console.log(`📊 Найдено объектов: ${objects.length}\n`);

    objects.forEach((obj, index) => {
      console.log(`${index + 1}. 🏢 ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Менеджер: ${obj.manager?.name || 'Не назначен'}`);
      console.log(`   Прямых техкарт: ${obj.techCards.length}`);
      console.log(`   Помещений: ${obj.rooms.length}`);
      console.log(`   Участков: ${obj.sites.length}`);
      
      // Проверяем помещения
      obj.rooms.forEach(room => {
        console.log(`     🏠 ${room.name}: ${room.techCards.length} техкарт, ${room.cleaningObjects.length} объектов уборки`);
        room.cleaningObjects.forEach(cleaningObj => {
          console.log(`       📦 ${cleaningObj.name}: ${cleaningObj.techCards.length} техкарт`);
        });
      });

      // Проверяем участки
      obj.sites.forEach(site => {
        console.log(`     🏗️ ${site.name}: ${site.zones.length} зон`);
        site.zones.forEach(zone => {
          console.log(`       🏭 ${zone.name}: ${zone.roomGroups.length} групп`);
          zone.roomGroups.forEach(group => {
            console.log(`         👥 ${group.name}: ${group.rooms.length} помещений`);
          });
        });
      });

      console.log('');
    });

    // Проверяем общее количество записей
    const counts = {
      objects: await prisma.cleaningObject.count(),
      rooms: await prisma.room.count(),
      techCards: await prisma.techCard.count(),
      sites: await prisma.site.count(),
      zones: await prisma.zone.count(),
      roomGroups: await prisma.roomGroup.count(),
      cleaningObjects: await prisma.cleaningObjectItem.count()
    };

    console.log('📈 Общая статистика:');
    Object.entries(counts).forEach(([key, count]) => {
      console.log(`   ${key}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
