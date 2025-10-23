const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNewObjects() {
  try {
    console.log('🔍 ПРОВЕРКА НОВЫХ ОБЪЕКТОВ');
    console.log('============================\n');

    // Список новых объектов для проверки
    const newObjectNames = [
      'ООО «НЛ Континент»',
      'ООО «Маркет.Операции»',
      'ООО ЧОО Гвардеец',
      'ООО «Электрощит-Инжиниринг»'
    ];

    let totalObjects = 0;
    let totalSites = 0;
    let totalZones = 0;
    let totalRooms = 0;
    let totalTechCards = 0;

    for (const objectName of newObjectNames) {
      console.log(`🏢 Проверяем объект: ${objectName}`);
      
      const cleaningObject = await prisma.cleaningObject.findFirst({
        where: { name: objectName },
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
          techCards: true
        }
      });

      if (!cleaningObject) {
        console.log(`❌ Объект не найден: ${objectName}\n`);
        continue;
      }

      totalObjects++;
      
      console.log(`   📍 Адрес: ${cleaningObject.address}`);
      console.log(`   📐 Площадь: ${cleaningObject.totalArea} м²`);
      console.log(`   📝 Описание: ${cleaningObject.description}`);
      console.log(`   🕒 Часовой пояс: ${cleaningObject.timezone}`);
      console.log(`   ⏰ Рабочие часы: ${cleaningObject.workingHours}`);
      console.log(`   📅 Рабочие дни: ${cleaningObject.workingDays.join(', ')}`);
      console.log(`   🤖 Автоматические чек-листы: ${cleaningObject.autoChecklistEnabled ? 'Включены' : 'Отключены'}`);
      
      // Статистика по участкам и зонам
      const sitesCount = cleaningObject.sites.length;
      totalSites += sitesCount;
      
      let zonesCount = 0;
      let roomsCount = 0;
      
      cleaningObject.sites.forEach(site => {
        zonesCount += site.zones.length;
        site.zones.forEach(zone => {
          zone.roomGroups.forEach(roomGroup => {
            roomsCount += roomGroup.rooms.length;
          });
        });
      });
      
      totalZones += zonesCount;
      totalRooms += roomsCount;
      
      const techCardsCount = cleaningObject.techCards.length;
      totalTechCards += techCardsCount;
      
      console.log(`   📊 Структура:`);
      console.log(`      - Участков: ${sitesCount}`);
      console.log(`      - Зон: ${zonesCount}`);
      console.log(`      - Помещений: ${roomsCount}`);
      console.log(`      - Техкарт: ${techCardsCount}`);

      // Детальная информация по участкам и зонам
      cleaningObject.sites.forEach(site => {
        console.log(`\n   🏗️ Участок: ${site.name}`);
        site.zones.forEach(zone => {
          console.log(`      📍 Зона: ${zone.name}`);
          zone.roomGroups.forEach(roomGroup => {
            console.log(`         📦 Группа помещений: ${roomGroup.name}`);
            roomGroup.rooms.forEach(room => {
              console.log(`            🏠 Помещение: ${room.name} (${room.area} м²)`);
            });
          });
        });
      });

      // Информация по техкартам
      if (cleaningObject.techCards.length > 0) {
        console.log(`\n   📋 Техкарты:`);
        const frequencyGroups = {};
        
        cleaningObject.techCards.forEach(techCard => {
          if (!frequencyGroups[techCard.frequency]) {
            frequencyGroups[techCard.frequency] = [];
          }
          frequencyGroups[techCard.frequency].push(techCard);
        });

        Object.keys(frequencyGroups).forEach(frequency => {
          const cards = frequencyGroups[frequency];
          console.log(`      ${frequency}: ${cards.length} техкарт`);
          cards.forEach(card => {
            console.log(`         - ${card.name} (${card.workType})`);
          });
        });
      }

      console.log('\n' + '='.repeat(50) + '\n');
    }

    // Итоговая статистика
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА ПО НОВЫМ ОБЪЕКТАМ:');
    console.log('==========================================');
    console.log(`🏢 Объектов проверено: ${totalObjects}`);
    console.log(`🏗️ Участков создано: ${totalSites}`);
    console.log(`📍 Зон создано: ${totalZones}`);
    console.log(`🏠 Помещений создано: ${totalRooms}`);
    console.log(`📋 Техкарт создано: ${totalTechCards}`);

    // Проверка общего количества объектов в системе
    const allObjectsCount = await prisma.cleaningObject.count();
    console.log(`\n🌍 Всего объектов в системе: ${allObjectsCount}`);

    console.log('\n✅ Проверка завершена успешно!');

  } catch (error) {
    console.error('❌ Ошибка при проверке объектов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск проверки
checkNewObjects();
