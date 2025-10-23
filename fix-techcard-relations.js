const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTechCardRelations() {
  try {
    console.log('🔧 Исправляем связи техкарт с помещениями и объектами уборки...');
    
    // Получаем все техкарты без помещений
    const techCards = await prisma.techCard.findMany({
      where: {
        roomId: null
      },
      include: {
        object: {
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
            }
          }
        }
      }
    });
    
    console.log(`📋 Найдено техкарт без помещений: ${techCards.length}`);
    
    // Получаем объекты уборки
    const cleaningItems = await prisma.cleaningObjectItem.findMany();
    console.log(`🧹 Доступно объектов уборки: ${cleaningItems.length}`);
    
    let updatedCount = 0;
    
    for (const techCard of techCards) {
      if (techCard.object?.rooms?.length > 0) {
        // Привязываем к первому доступному помещению объекта
        const room = techCard.object.rooms[0];
        
        // Выбираем случайный объект уборки
        const randomCleaningItem = cleaningItems[Math.floor(Math.random() * cleaningItems.length)];
        
        await prisma.techCard.update({
          where: { id: techCard.id },
          data: {
            roomId: room.id,
            cleaningObjectItemId: randomCleaningItem?.id || null
          }
        });
        
        console.log(`✅ Обновлена техкарта "${techCard.name}"`);
        console.log(`   Помещение: ${room.name}`);
        console.log(`   Участок: ${room.roomGroup?.zone?.site?.name || 'Не указан'}`);
        console.log(`   Зона: ${room.roomGroup?.zone?.name || 'Не указана'}`);
        console.log(`   Группа: ${room.roomGroup?.name || 'Не указана'}`);
        console.log(`   Объект уборки: ${randomCleaningItem?.name || 'Не указан'}`);
        console.log('');
        
        updatedCount++;
      }
    }
    
    console.log(`🎉 Обновлено техкарт: ${updatedCount}`);
    
    // Проверяем результат
    const updatedTechCards = await prisma.techCard.findMany({
      where: {
        roomId: { not: null }
      },
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
    });
    
    console.log('\n✅ Примеры обновленных техкарт:');
    updatedTechCards.forEach((card, i) => {
      console.log(`${i+1}. ${card.name}`);
      console.log(`   Помещение: ${card.room?.name || 'Не указано'}`);
      console.log(`   Участок: ${card.room?.roomGroup?.zone?.site?.name || 'Не указан'}`);
      console.log(`   Зона: ${card.room?.roomGroup?.zone?.name || 'Не указана'}`);
      console.log(`   Группа: ${card.room?.roomGroup?.name || 'Не указана'}`);
      console.log(`   Объект уборки: ${card.cleaningObjectItem?.name || 'Не указан'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixTechCardRelations();
