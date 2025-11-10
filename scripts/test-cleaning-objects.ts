import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCleaningObjects() {
  console.log('🧪 ТЕСТ: Проверка объектов уборки\n');
  
  // Ищем объект с группами
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
                      },
                      techCards: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    take: 5
  });
  
  console.log(`📊 Найдено объектов: ${objects.length}\n`);
  
  objects.forEach((obj, i) => {
    console.log(`${i + 1}. ${obj.name}`);
    
    obj.sites.forEach(site => {
      console.log(`   📍 Участок: ${site.name}`);
      
      site.zones.forEach(zone => {
        console.log(`      🏗️  Зона: ${zone.name}`);
        
        zone.roomGroups.forEach(group => {
          console.log(`         📦 Группа: ${group.name}`);
          
          group.rooms.forEach(room => {
            if (room.name === '__VIRTUAL__') {
              console.log(`            🔹 (виртуальное помещение)`);
            } else {
              console.log(`            🏠 Помещение: ${room.name}`);
            }
            
            // Объекты уборки
            if (room.cleaningObjects && room.cleaningObjects.length > 0) {
              console.log(`               📋 Объектов уборки: ${room.cleaningObjects.length}`);
              room.cleaningObjects.forEach(co => {
                console.log(`                  - ${co.name} (${co.techCards?.length || 0} техкарт)`);
              });
            }
            
            // Техкарты без объектов уборки
            if (room.techCards && room.techCards.length > 0) {
              console.log(`               🔧 Техкарт без объектов уборки: ${room.techCards.length}`);
            }
          });
        });
      });
    });
    
    console.log();
  });
  
  await prisma.$disconnect();
}

testCleaningObjects().catch(console.error);
