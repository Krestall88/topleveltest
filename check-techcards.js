const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTechCards() {
  try {
    console.log('🔍 Проверяем техкарты в базе данных...');
    
    // Проверяем техкарты
    const techCards = await prisma.techCard.findMany({
      include: {
        object: {
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            }
          }
        },
        room: {
          select: {
            id: true,
            name: true,
            roomGroup: {
              select: {
                id: true,
                name: true,
                zone: {
                  select: {
                    id: true,
                    name: true,
                    site: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        cleaningObjectItem: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 5
    });
    
    console.log(`📋 Найдено техкарт: ${techCards.length}`);
    
    if (techCards.length > 0) {
      console.log('\n✅ Примеры техкарт:');
      techCards.forEach((card, i) => {
        console.log(`${i+1}. ${card.name}`);
        console.log(`   Объект: ${card.object?.name || 'Не указан'}`);
        console.log(`   Менеджер: ${card.object?.manager?.name || 'Не назначен'}`);
        console.log(`   Помещение: ${card.room?.name || 'Не указано'}`);
        console.log(`   Участок: ${card.room?.roomGroup?.zone?.site?.name || 'Не указан'}`);
        console.log(`   Зона: ${card.room?.roomGroup?.zone?.name || 'Не указана'}`);
        console.log(`   Группа: ${card.room?.roomGroup?.name || 'Не указана'}`);
        console.log(`   Объект уборки: ${card.cleaningObjectItem?.name || 'Не указан'}`);
        console.log(`   Периодичность: ${card.frequency || 'Не указана'}`);
        console.log('');
      });
    } else {
      console.log('❌ Техкарты не найдены в базе данных!');
    }
    
    // Проверим структуру базы данных
    console.log('\n🔍 Проверяем структуру базы данных...');
    const objects = await prisma.cleaningObject.count();
    console.log(`🏢 Объектов в базе: ${objects}`);
    
    const rooms = await prisma.room.count();
    console.log(`🏠 Помещений в базе: ${rooms}`);
    
    const sites = await prisma.site.count();
    console.log(`🏗️ Участков в базе: ${sites}`);
    
    const zones = await prisma.zone.count();
    console.log(`🌍 Зон в базе: ${zones}`);
    
    const roomGroups = await prisma.roomGroup.count();
    console.log(`📦 Групп помещений в базе: ${roomGroups}`);
    
    const cleaningItems = await prisma.cleaningObjectItem.count();
    console.log(`🧹 Объектов уборки в базе: ${cleaningItems}`);
    
    const users = await prisma.user.count();
    console.log(`👥 Пользователей в базе: ${users}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechCards();
