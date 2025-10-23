const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTechCardDistribution() {
  try {
    console.log('🔧 Исправляем распределение техкарт по помещениям...');
    
    // Получаем все объекты с их помещениями и техкартами
    const objects = await prisma.cleaningObject.findMany({
      include: {
        rooms: {
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
        techCards: true
      }
    });
    
    console.log(`🏢 Найдено объектов: ${objects.length}`);
    
    // Получаем все объекты уборки
    const cleaningItems = await prisma.cleaningObjectItem.findMany();
    console.log(`🧹 Объектов уборки: ${cleaningItems.length}`);
    
    let totalUpdated = 0;
    
    for (const object of objects) {
      if (object.rooms.length > 0 && object.techCards.length > 0) {
        console.log(`\n🏢 Обрабатываем объект: ${object.name}`);
        console.log(`   Помещений: ${object.rooms.length}`);
        console.log(`   Техкарт: ${object.techCards.length}`);
        
        // Распределяем техкарты равномерно по помещениям
        for (let i = 0; i < object.techCards.length; i++) {
          const techCard = object.techCards[i];
          const room = object.rooms[i % object.rooms.length]; // Циклически распределяем
          const randomCleaningItem = cleaningItems[Math.floor(Math.random() * cleaningItems.length)];
          
          await prisma.techCard.update({
            where: { id: techCard.id },
            data: {
              roomId: room.id,
              cleaningObjectItemId: randomCleaningItem?.id || null
            }
          });
          
          console.log(`   ✅ ${techCard.name.substring(0, 50)}...`);
          console.log(`      → Помещение: ${room.name}`);
          console.log(`      → Участок: ${room.roomGroup?.zone?.site?.name || 'Не указан'}`);
          console.log(`      → Зона: ${room.roomGroup?.zone?.name || 'Не указана'}`);
          console.log(`      → Группа: ${room.roomGroup?.name || 'Не указана'}`);
          console.log(`      → Объект уборки: ${randomCleaningItem?.name || 'Не указан'}`);
          
          totalUpdated++;
        }
      } else {
        console.log(`⚠️ Пропускаем объект ${object.name}: помещений=${object.rooms.length}, техкарт=${object.techCards.length}`);
      }
    }
    
    console.log(`\n🎉 Всего обновлено техкарт: ${totalUpdated}`);
    
    // Проверяем результат
    console.log('\n🔍 Проверяем результат...');
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER'
      },
      include: {
        managedObjects: {
          include: {
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
              },
              take: 3
            }
          }
        }
      },
      take: 3
    });
    
    managers.forEach((manager, i) => {
      console.log(`\n${i+1}. Менеджер: ${manager.name}`);
      
      manager.managedObjects?.forEach((object, j) => {
        console.log(`   ${j+1}. Объект: ${object.name}`);
        
        const uniqueRooms = new Set();
        const uniqueSites = new Set();
        
        object.techCards?.forEach((techCard) => {
          if (techCard.room?.name) uniqueRooms.add(techCard.room.name);
          if (techCard.room?.roomGroup?.zone?.site?.name) uniqueSites.add(techCard.room.roomGroup.zone.site.name);
        });
        
        console.log(`      Уникальных помещений: ${uniqueRooms.size}`);
        console.log(`      Уникальных участков: ${uniqueSites.size}`);
        
        if (uniqueRooms.size > 0) {
          console.log(`      Помещения: ${Array.from(uniqueRooms).slice(0, 3).join(', ')}${uniqueRooms.size > 3 ? '...' : ''}`);
        }
        if (uniqueSites.size > 0) {
          console.log(`      Участки: ${Array.from(uniqueSites).slice(0, 3).join(', ')}${uniqueSites.size > 3 ? '...' : ''}`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixTechCardDistribution();
