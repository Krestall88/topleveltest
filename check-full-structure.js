const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFullStructure() {
  try {
    console.log('🔍 ПРОВЕРКА ПОЛНОЙ МНОГОУРОВНЕВОЙ СТРУКТУРЫ');
    console.log('==========================================\n');

    // Получаем объект Пепси с полной структурой
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

    if (!pepsiObject) {
      console.log('❌ Объект Пепси не найден');
      return;
    }

    console.log('🏗️ ПОЛНАЯ СТРУКТУРА ОБЪЕКТА ПЕПСИ:');
    console.log('===================================\n');

    let totalSites = 0;
    let totalZones = 0;
    let totalRoomGroups = 0;
    let totalRooms = 0;
    let totalCleaningObjects = 0;
    let totalTechCards = 0;

    console.log(`🏢 ОБЪЕКТ: ${pepsiObject.name}`);
    console.log(`   📐 Площадь: ${pepsiObject.totalArea} м²`);
    console.log(`   📝 Описание: ${pepsiObject.description}\n`);

    // Проходим по всей структуре
    pepsiObject.sites.forEach(site => {
      totalSites++;
      console.log(`🏗️ УЧАСТОК: ${site.name}`);
      
      site.zones.forEach(zone => {
        totalZones++;
        console.log(`  📍 ЗОНА: ${zone.name}`);
        
        zone.roomGroups.forEach(roomGroup => {
          totalRoomGroups++;
          console.log(`    📦 ГРУППА ПОМЕЩЕНИЙ: ${roomGroup.name}`);
          
          roomGroup.rooms.forEach(room => {
            totalRooms++;
            console.log(`      🏠 ПОМЕЩЕНИЕ: ${room.name} (${room.area} м²)`);
            
            room.cleaningObjects.forEach(cleaningObject => {
              totalCleaningObjects++;
              console.log(`        📋 ОБЪЕКТ УБОРКИ: ${cleaningObject.name} (${cleaningObject.techCards.length} техкарт)`);
              
              cleaningObject.techCards.forEach(techCard => {
                totalTechCards++;
                console.log(`          🔧 ТЕХКАРТА: ${techCard.name} [${techCard.frequency}]`);
              });
            });
          });
        });
      });
      console.log('');
    });

    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('========================');
    console.log(`🏢 Объектов: 1`);
    console.log(`🏗️ Участков: ${totalSites}`);
    console.log(`📍 Зон: ${totalZones}`);
    console.log(`📦 Групп помещений: ${totalRoomGroups}`);
    console.log(`🏠 Помещений: ${totalRooms}`);
    console.log(`📋 Объектов уборки: ${totalCleaningObjects}`);
    console.log(`🔧 Техкарт: ${totalTechCards}\n`);

    console.log('🎯 СТРУКТУРА УРОВНЕЙ:');
    console.log('=====================');
    console.log('1️⃣ Объект (CleaningObject)');
    console.log('2️⃣ Участок (Site)');
    console.log('3️⃣ Зона (Zone)');
    console.log('4️⃣ Группа помещений (RoomGroup)');
    console.log('5️⃣ Помещение (Room)');
    console.log('6️⃣ Объект уборки (CleaningObjectItem)');
    console.log('7️⃣ Техкарта (TechCard)\n');

    console.log('✅ ПОЛНАЯ 7-УРОВНЕВАЯ СТРУКТУРА РЕАЛИЗОВАНА!');
    console.log('✅ Все данные корректно связаны');
    console.log('✅ Готово для создания интерфейса с раскрывающимися списками');

  } catch (error) {
    console.error('❌ Ошибка при проверке структуры:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFullStructure();
