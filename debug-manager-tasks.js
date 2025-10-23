const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugManagerTasks() {
  try {
    console.log('🔍 Отладка задач менеджеров...');
    
    // Проверим менеджеров и их объекты
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
    
    console.log(`👥 Найдено менеджеров: ${managers.length}`);
    
    managers.forEach((manager, i) => {
      console.log(`\n${i+1}. Менеджер: ${manager.name}`);
      console.log(`   Email: ${manager.email}`);
      console.log(`   Объектов: ${manager.managedObjects?.length || 0}`);
      
      manager.managedObjects?.forEach((object, j) => {
        console.log(`   ${j+1}. Объект: ${object.name}`);
        console.log(`      Техкарт: ${object.techCards?.length || 0}`);
        
        object.techCards?.forEach((techCard, k) => {
          console.log(`      ${k+1}. Техкарта: ${techCard.name}`);
          console.log(`         Помещение: ${techCard.room?.name || 'НЕТ'}`);
          console.log(`         Участок: ${techCard.room?.roomGroup?.zone?.site?.name || 'НЕТ'}`);
          console.log(`         Зона: ${techCard.room?.roomGroup?.zone?.name || 'НЕТ'}`);
          console.log(`         Группа: ${techCard.room?.roomGroup?.name || 'НЕТ'}`);
          console.log(`         Объект уборки: ${techCard.cleaningObjectItem?.name || 'НЕТ'}`);
        });
      });
    });
    
    // Проверим, как техкарты связаны с помещениями
    console.log('\n🔍 Проверяем связи техкарт с помещениями...');
    const techCardsWithRooms = await prisma.techCard.findMany({
      where: {
        roomId: { not: null }
      },
      include: {
        object: {
          select: {
            name: true,
            manager: {
              select: {
                name: true
              }
            }
          }
        },
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
      take: 10
    });
    
    console.log(`📋 Техкарт с помещениями: ${techCardsWithRooms.length}`);
    
    // Группируем по менеджерам
    const byManager = {};
    techCardsWithRooms.forEach(tc => {
      const managerName = tc.object?.manager?.name || 'Без менеджера';
      if (!byManager[managerName]) {
        byManager[managerName] = [];
      }
      byManager[managerName].push(tc);
    });
    
    console.log('\n📊 Распределение по менеджерам:');
    Object.entries(byManager).forEach(([managerName, techCards]) => {
      console.log(`${managerName}: ${techCards.length} техкарт`);
      
      // Проверим уникальность помещений
      const uniqueRooms = new Set(techCards.map(tc => tc.room?.name).filter(Boolean));
      const uniqueSites = new Set(techCards.map(tc => tc.room?.roomGroup?.zone?.site?.name).filter(Boolean));
      
      console.log(`  Уникальных помещений: ${uniqueRooms.size}`);
      console.log(`  Уникальных участков: ${uniqueSites.size}`);
      
      if (uniqueRooms.size <= 3) {
        console.log(`  Помещения: ${Array.from(uniqueRooms).join(', ')}`);
      }
      if (uniqueSites.size <= 3) {
        console.log(`  Участки: ${Array.from(uniqueSites).join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugManagerTasks();
