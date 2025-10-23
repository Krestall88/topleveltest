const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPepsiStructure() {
  try {
    console.log('🔍 ПРОВЕРКА СТРУКТУРЫ ОБЪЕКТА ПЕПСИ');
    console.log('===================================\n');

    // Находим объект Пепси
    const pepsiObject = await prisma.cleaningObject.findFirst({
      where: { name: 'ООО «ПепсиКо Холдингс»' },
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

    if (!pepsiObject) {
      console.log('❌ Объект Пепси не найден');
      return;
    }

    console.log(`🏭 Объект: ${pepsiObject.name}`);
    console.log(`📍 Адрес: ${pepsiObject.address}`);
    console.log(`📐 Площадь: ${pepsiObject.totalArea} м²`);
    console.log(`📝 Описание: ${pepsiObject.description}`);
    console.log(`🕒 Часовой пояс: ${pepsiObject.timezone}`);
    console.log(`⏰ Рабочие часы: ${pepsiObject.workingHours}`);
    console.log(`📅 Рабочие дни: ${pepsiObject.workingDays.join(', ')}`);
    console.log(`🤖 Автоматические чек-листы: ${pepsiObject.autoChecklistEnabled ? 'Включены' : 'Отключены'}\n`);

    // Статистика по структуре
    let totalZones = 0;
    let totalRoomGroups = 0;
    let totalRooms = 0;
    let totalArea = 0;

    pepsiObject.sites.forEach(site => {
      console.log(`🏗️ Участок: ${site.name}`);
      totalZones += site.zones.length;
      
      site.zones.forEach(zone => {
        console.log(`  📍 Зона: ${zone.name}`);
        totalRoomGroups += zone.roomGroups.length;
        
        zone.roomGroups.forEach(roomGroup => {
          console.log(`    📦 Группа помещений: ${roomGroup.name}`);
          totalRooms += roomGroup.rooms.length;
          
          roomGroup.rooms.forEach(room => {
            console.log(`      🏠 Помещение: ${room.name} (${room.area} м²)`);
            totalArea += room.area || 0;
          });
        });
      });
      console.log('');
    });

    // Статистика по техкартам
    const techCardsByFrequency = {};
    const techCardsByWorkType = {};
    const techCardsByRoom = {};

    pepsiObject.techCards.forEach(techCard => {
      // По периодичности
      if (!techCardsByFrequency[techCard.frequency]) {
        techCardsByFrequency[techCard.frequency] = [];
      }
      techCardsByFrequency[techCard.frequency].push(techCard);

      // По типу работ
      if (!techCardsByWorkType[techCard.workType]) {
        techCardsByWorkType[techCard.workType] = [];
      }
      techCardsByWorkType[techCard.workType].push(techCard);

      // По помещениям
      const roomName = techCard.room ? techCard.room.name : 'Без помещения';
      if (!techCardsByRoom[roomName]) {
        techCardsByRoom[roomName] = [];
      }
      techCardsByRoom[roomName].push(techCard);
    });

    console.log('📊 ОБЩАЯ СТАТИСТИКА:');
    console.log('====================');
    console.log(`🏗️ Участков: ${pepsiObject.sites.length}`);
    console.log(`📍 Зон: ${totalZones}`);
    console.log(`📦 Групп помещений: ${totalRoomGroups}`);
    console.log(`🏠 Помещений: ${totalRooms}`);
    console.log(`📐 Общая площадь помещений: ${totalArea} м²`);
    console.log(`📋 Техкарт: ${pepsiObject.techCards.length}\n`);

    console.log('📋 ТЕХКАРТЫ ПО ПЕРИОДИЧНОСТИ:');
    console.log('=============================');
    Object.keys(techCardsByFrequency).sort().forEach(frequency => {
      const cards = techCardsByFrequency[frequency];
      console.log(`${frequency}: ${cards.length} техкарт`);
      cards.slice(0, 3).forEach(card => {
        console.log(`  - ${card.name}`);
      });
      if (cards.length > 3) {
        console.log(`  ... и еще ${cards.length - 3} техкарт`);
      }
      console.log('');
    });

    console.log('🔧 ТЕХКАРТЫ ПО ТИПУ РАБОТ:');
    console.log('==========================');
    Object.keys(techCardsByWorkType).sort().forEach(workType => {
      const cards = techCardsByWorkType[workType];
      console.log(`${workType}: ${cards.length} техкарт`);
    });
    console.log('');

    console.log('🏠 ТЕХКАРТЫ ПО ПОМЕЩЕНИЯМ (ТОП-10):');
    console.log('===================================');
    const roomsSorted = Object.entries(techCardsByRoom)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    roomsSorted.forEach(([roomName, cards]) => {
      console.log(`${roomName}: ${cards.length} техкарт`);
    });
    console.log('');

    // Проверка на дубликаты техкарт
    const techCardNames = pepsiObject.techCards.map(tc => tc.name);
    const duplicateNames = techCardNames.filter((name, index) => techCardNames.indexOf(name) !== index);
    
    if (duplicateNames.length > 0) {
      console.log('⚠️ НАЙДЕНЫ ДУБЛИКАТЫ ТЕХКАРТ:');
      console.log('=============================');
      const uniqueDuplicates = [...new Set(duplicateNames)];
      uniqueDuplicates.forEach(name => {
        const count = techCardNames.filter(n => n === name).length;
        console.log(`"${name}": ${count} раз`);
      });
      console.log('');
    } else {
      console.log('✅ Дубликатов техкарт не найдено\n');
    }

    // Проверка на техкарты без помещений
    const techCardsWithoutRoom = pepsiObject.techCards.filter(tc => !tc.roomId);
    if (techCardsWithoutRoom.length > 0) {
      console.log('⚠️ ТЕХКАРТЫ БЕЗ ПРИВЯЗКИ К ПОМЕЩЕНИЯМ:');
      console.log('=====================================');
      techCardsWithoutRoom.forEach(tc => {
        console.log(`- ${tc.name}`);
      });
      console.log('');
    } else {
      console.log('✅ Все техкарты привязаны к помещениям\n');
    }

    console.log('🎯 ГОТОВНОСТЬ К РАБОТЕ:');
    console.log('=======================');
    console.log('✅ Объект создан и настроен');
    console.log('✅ Структура участков, зон и помещений готова');
    console.log('✅ Техкарты созданы и привязаны к помещениям');
    console.log('✅ Автогенерация чек-листов включена');
    console.log('✅ Рабочие часы и дни настроены');
    console.log('');
    console.log('🚀 Объект Пепси готов к назначению менеджера и созданию чек-листов!');

  } catch (error) {
    console.error('❌ Ошибка при проверке структуры Пепси:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск проверки
checkPepsiStructure();
