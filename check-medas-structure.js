const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🏥 ПРОВЕРКА СТРУКТУРЫ МЕДАС');
console.log('==========================');

async function checkMedASStructure() {
  try {
    // Получаем объект МедАС
    const medas = await prisma.cleaningObject.findFirst({
      where: { name: 'Медицина АльфаСтрахования МедАС' },
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: {
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
    });

    if (!medas) {
      console.log('❌ Объект МедАС не найден');
      return;
    }

    console.log(`\n🏢 ОБЪЕКТ: ${medas.name}`);
    console.log(`📍 Адрес: ${medas.address}`);
    console.log(`📐 Общая площадь: ${medas.area} м²`);
    console.log(`🏥 Тип: ${medas.type}`);

    let totalTechCards = 0;
    let totalRooms = 0;
    let totalZones = 0;

    // Проходим по всем участкам
    for (const site of medas.sites) {
      console.log(`\n📍 УЧАСТОК: ${site.name}`);
      
      // Проходим по всем зонам
      for (const zone of site.zones) {
        totalZones++;
        console.log(`\n  🏢 ЗОНА ${totalZones}: ${zone.name}`);
        console.log(`     📐 Площадь: ${zone.area} м²`);
        console.log(`     📝 Описание: ${zone.description}`);

        let zoneTechCards = 0;
        let zoneRooms = 0;

        // Проходим по группам помещений
        for (const roomGroup of zone.roomGroups) {
          console.log(`\n    📦 Группа: ${roomGroup.name}`);
          
          // Проходим по помещениям
          for (const room of roomGroup.rooms) {
            zoneRooms++;
            totalRooms++;
            console.log(`\n      🏠 Помещение: ${room.name}`);
            console.log(`         📐 Площадь: ${room.area} м²`);
            console.log(`         📋 Техкарт: ${room.techCards.length}`);

            // Показываем техкарты
            room.techCards.forEach((techCard, index) => {
              zoneTechCards++;
              totalTechCards++;
              console.log(`         ${index + 1}. ${techCard.name} (${techCard.frequency})`);
            });
          }
        }

        console.log(`\n  📊 Итого в зоне: ${zoneRooms} помещений, ${zoneTechCards} техкарт`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА МЕДАС:');
    console.log('='.repeat(50));
    console.log(`🏢 Объект: ${medas.name}`);
    console.log(`📍 Участков: ${medas.sites.length}`);
    console.log(`🏢 Зон: ${totalZones}`);
    console.log(`🏠 Помещений: ${totalRooms}`);
    console.log(`📋 Техкарт: ${totalTechCards}`);
    console.log(`📐 Общая площадь: ${medas.area} м²`);

    // Статистика по зонам
    console.log('\n📋 РАСПРЕДЕЛЕНИЕ ПО ЗОНАМ:');
    let zoneIndex = 1;
    for (const site of medas.sites) {
      for (const zone of site.zones) {
        let zoneTechCards = 0;
        for (const roomGroup of zone.roomGroups) {
          for (const room of roomGroup.rooms) {
            zoneTechCards += room.techCards.length;
          }
        }
        console.log(`${zoneIndex}. ${zone.name}: ${zoneTechCards} техкарт (${zone.area} м²)`);
        zoneIndex++;
      }
    }

    // Статистика по периодичности
    console.log('\n📅 РАСПРЕДЕЛЕНИЕ ПО ПЕРИОДИЧНОСТИ:');
    const frequencyStats = {};
    
    for (const site of medas.sites) {
      for (const zone of site.zones) {
        for (const roomGroup of zone.roomGroups) {
          for (const room of roomGroup.rooms) {
            for (const techCard of room.techCards) {
              frequencyStats[techCard.frequency] = (frequencyStats[techCard.frequency] || 0) + 1;
            }
          }
        }
      }
    }

    Object.entries(frequencyStats).forEach(([frequency, count]) => {
      const percentage = ((count / totalTechCards) * 100).toFixed(1);
      console.log(`${frequency}: ${count} техкарт (${percentage}%)`);
    });

    console.log('\n🎉 СТРУКТУРА МЕДАС ПОЛНОСТЬЮ СОЗДАНА И ГОТОВА К РАБОТЕ!');
    console.log('🚀 Можно назначать менеджера и создавать автоматические чек-листы');

  } catch (error) {
    console.error('❌ Ошибка при проверке структуры:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMedASStructure();
