const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSpecificYugServis() {
  try {
    console.log('🔍 ПРОВЕРКА КОНКРЕТНОГО ОБЪЕКТА УК ЮГ-СЕРВИС');
    console.log('============================================\n');

    // Проверяем объект по ID из URL
    const objectId = 'cmgyu7kxr036zvyjomsbe8fp6'; // ID из вывода check-all-yug-servis.js
    
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      include: {
        manager: { select: { name: true } },
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
        rooms: true,
        techCards: true,
        _count: {
          select: {
            rooms: true,
            techCards: true,
            checklists: true
          }
        }
      }
    });

    if (!object) {
      console.log('❌ Объект не найден');
      return;
    }

    console.log('📋 ИНФОРМАЦИЯ ОБ ОБЪЕКТЕ:');
    console.log(`🏢 Название: ${object.name}`);
    console.log(`🆔 ID: ${object.id}`);
    console.log(`👤 Менеджер: ${object.manager?.name || 'не назначен'}`);
    console.log(`🗺️ Участков: ${object.sites.length}`);
    console.log(`🚪 Помещений: ${object._count.rooms}`);
    console.log(`🔧 Техкарт: ${object._count.techCards}`);
    console.log(`📋 Чек-листов: ${object._count.checklists}`);

    // Анализируем структуру участков
    if (object.sites.length > 0) {
      console.log('\n🗺️ АНАЛИЗ УЧАСТКОВ:');
      let totalZones = 0;
      let totalRoomGroups = 0;
      let totalRoomsInSites = 0;

      object.sites.forEach((site, index) => {
        console.log(`${index + 1}. ${site.name}`);
        console.log(`   🏠 Зон: ${site.zones.length}`);
        totalZones += site.zones.length;
        
        site.zones.forEach((zone, zIndex) => {
          console.log(`      ${zIndex + 1}. ${zone.name}`);
          console.log(`         📦 Групп помещений: ${zone.roomGroups.length}`);
          totalRoomGroups += zone.roomGroups.length;
          
          zone.roomGroups.forEach((roomGroup, rgIndex) => {
            console.log(`            ${rgIndex + 1}. ${roomGroup.name} (${roomGroup.rooms.length} помещений)`);
            totalRoomsInSites += roomGroup.rooms.length;
          });
        });
      });

      console.log(`\n📊 ИТОГО В СТРУКТУРЕ:`);
      console.log(`🏠 Всего зон: ${totalZones}`);
      console.log(`📦 Всего групп помещений: ${totalRoomGroups}`);
      console.log(`🚪 Помещений в структуре: ${totalRoomsInSites}`);
    }

    // Определяем тип структуры
    const hasMultiLevel = object.sites.some(site => 
      site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
    );

    console.log('\n📋 ТИП СТРУКТУРЫ:');
    if (hasMultiLevel) {
      console.log('✅ МНОГОУРОВНЕВАЯ: Объект → Участки → Зоны → Группы помещений → Помещения');
    } else if (object.sites.length > 0) {
      console.log('⚠️ ТОЛЬКО УЧАСТКИ: есть участки, но нет детальной структуры');
    } else if (object.rooms.length > 0) {
      console.log('⚠️ СТАРАЯ СТРУКТУРА: помещения напрямую в объекте');
    } else {
      console.log('❌ ПУСТАЯ СТРУКТУРА');
    }

    // Показываем первые несколько техкарт
    if (object.techCards.length > 0) {
      console.log('\n🔧 ПРИМЕРЫ ТЕХКАРТ:');
      object.techCards.slice(0, 5).forEach((tc, index) => {
        console.log(`${index + 1}. ${tc.name || tc.description}`);
        console.log(`   📅 ${tc.frequency}`);
        console.log(`   🏷️ ${tc.workType}`);
      });
      if (object.techCards.length > 5) {
        console.log(`   ... и еще ${object.techCards.length - 5} техкарт`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificYugServis();
