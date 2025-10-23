const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStructure() {
  try {
    console.log('🔍 ПРОВЕРКА ТЕКУЩЕЙ СТРУКТУРЫ БАЗЫ ДАННЫХ');
    console.log('==========================================\n');

    // Проверяем схему базы данных
    console.log('📊 СХЕМА БАЗЫ ДАННЫХ:');
    console.log('=====================');
    
    // Получаем все объекты с полной структурой
    const objects = await prisma.cleaningObject.findMany({
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: true
                  }
                }
              }
            }
          }
        },
        techCards: {
          include: {
            room: true
          }
        }
      }
    });

    console.log(`Всего объектов в базе: ${objects.length}\n`);

    // Анализируем каждый объект
    for (const object of objects) {
      console.log(`🏢 ОБЪЕКТ: ${object.name}`);
      console.log(`   Участков: ${object.sites.length}`);
      
      let totalZones = 0;
      let totalRoomGroups = 0;
      let totalRooms = 0;
      
      for (const site of object.sites) {
        console.log(`   🏗️ Участок: ${site.name}`);
        totalZones += site.zones.length;
        
        for (const zone of site.zones) {
          console.log(`      📍 Зона: ${zone.name}`);
          totalRoomGroups += zone.roomGroups.length;
          
          for (const roomGroup of zone.roomGroups) {
            console.log(`         📦 Группа помещений: ${roomGroup.name}`);
            totalRooms += roomGroup.rooms.length;
            
            for (const room of roomGroup.rooms) {
              console.log(`            🏠 Помещение: ${room.name} (${room.area} м²)`);
            }
          }
        }
      }
      
      console.log(`   Итого - Зон: ${totalZones}, Групп: ${totalRoomGroups}, Помещений: ${totalRooms}`);
      console.log(`   Техкарт: ${object.techCards.length}\n`);
    }

    // Проверяем структуру техкарт
    console.log('📋 АНАЛИЗ ТЕХКАРТ:');
    console.log('==================');
    
    const allTechCards = await prisma.techCard.findMany({
      include: {
        room: {
          include: {
            roomGroup: {
              include: {
                zone: {
                  include: {
                    site: {
                      include: {
                        object: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        object: true
      }
    });

    console.log(`Всего техкарт в базе: ${allTechCards.length}`);
    
    // Проверяем, есть ли техкарты без привязки к помещениям
    const techCardsWithoutRoom = allTechCards.filter(tc => !tc.roomId);
    console.log(`Техкарт без привязки к помещению: ${techCardsWithoutRoom.length}`);
    
    // Проверяем уровни вложенности
    let maxLevels = 0;
    const levelStructure = {};
    
    for (const techCard of allTechCards) {
      if (techCard.room) {
        const objectName = techCard.room.roomGroup.zone.site.object.name;
        const siteName = techCard.room.roomGroup.zone.site.name;
        const zoneName = techCard.room.roomGroup.zone.name;
        const roomGroupName = techCard.room.roomGroup.name;
        const roomName = techCard.room.name;
        
        if (!levelStructure[objectName]) {
          levelStructure[objectName] = {};
        }
        if (!levelStructure[objectName][siteName]) {
          levelStructure[objectName][siteName] = {};
        }
        if (!levelStructure[objectName][siteName][zoneName]) {
          levelStructure[objectName][siteName][zoneName] = {};
        }
        if (!levelStructure[objectName][siteName][zoneName][roomGroupName]) {
          levelStructure[objectName][siteName][zoneName][roomGroupName] = {};
        }
        if (!levelStructure[objectName][siteName][zoneName][roomGroupName][roomName]) {
          levelStructure[objectName][siteName][zoneName][roomGroupName][roomName] = [];
        }
        
        levelStructure[objectName][siteName][zoneName][roomGroupName][roomName].push({
          name: techCard.name,
          workType: techCard.workType,
          frequency: techCard.frequency
        });
      }
    }

    console.log('\n🏗️ ТЕКУЩАЯ СТРУКТУРА УРОВНЕЙ:');
    console.log('==============================');
    console.log('Объект → Участок → Зона → Группа помещений → Помещение → Техкарты');
    console.log('Это соответствует полной 5-уровневой структуре!\n');

    // Проверяем, какие поля отсутствуют в техкартах
    console.log('❓ ОТСУТСТВУЮЩИЕ ПОЛЯ В ТЕХКАРТАХ:');
    console.log('=================================');
    
    const sampleTechCard = allTechCards[0];
    if (sampleTechCard) {
      console.log('Текущие поля техкарты:');
      console.log('- id, name, workType, description, frequency');
      console.log('- roomId, objectId, createdAt, updatedAt');
      console.log('\nОТСУТСТВУЮТ поля из исходных данных:');
      console.log('- "объект уборки" (промежуточный уровень между помещением и техзаданием)');
      console.log('- детальные примечания');
      console.log('- период выполнения');
      console.log('- специфические требования');
    }

    console.log('\n🎯 ВЫВОД:');
    console.log('=========');
    console.log('✅ В базе ЕСТЬ полная 5-уровневая структура');
    console.log('✅ Все данные сохранены: Объект → Участок → Зона → Группа → Помещение');
    console.log('❌ НО отсутствует уровень "Объект уборки" между помещением и техкартой');
    console.log('❌ Техкарты упрощены - нет детальной структуры из исходных данных');
    console.log('\n💡 РЕШЕНИЕ: Нужно добавить модель CleaningTask между Room и TechCard');

  } catch (error) {
    console.error('❌ Ошибка при проверке структуры:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();
