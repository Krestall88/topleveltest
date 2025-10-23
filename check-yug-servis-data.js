const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkYugServisData() {
  try {
    console.log('🔍 ПРОВЕРКА ДАННЫХ УК ЮГ-СЕРВИС');
    console.log('===============================\n');

    // Находим объект УК Юг-сервис
    const yugServisObject = await prisma.cleaningObject.findFirst({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      include: {
        manager: {
          select: { name: true }
        },
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
            sites: true,
            rooms: true,
            techCards: true
          }
        }
      }
    });

    if (!yugServisObject) {
      console.log('❌ Объект УК Юг-сервис не найден в базе данных');
      return;
    }

    console.log('✅ НАЙДЕН ОБЪЕКТ:');
    console.log(`📋 Название: ${yugServisObject.name}`);
    console.log(`👤 Менеджер: ${yugServisObject.manager?.name || 'не назначен'}`);
    console.log(`🗺️ Участков: ${yugServisObject._count.sites}`);
    
    // Подсчитываем зоны вручную
    const totalZones = yugServisObject.sites.reduce((sum, site) => sum + site.zones.length, 0);
    console.log(`🏠 Зон: ${totalZones}`);
    
    console.log(`🚪 Помещений: ${yugServisObject._count.rooms}`);
    console.log(`🔧 Техкарт: ${yugServisObject._count.techCards}`);

    console.log('\n📊 ДЕТАЛЬНАЯ СТРУКТУРА:');
    console.log('='.repeat(40));

    if (yugServisObject.sites.length > 0) {
      console.log(`\n🗺️ УЧАСТКИ (${yugServisObject.sites.length}):`);
      yugServisObject.sites.forEach((site, index) => {
        console.log(`${index + 1}. ${site.name}`);
        console.log(`   📐 Площадь: ${site.area || 'не указана'} м²`);
        console.log(`   📝 Описание: ${site.description || 'нет'}`);
        
        if (site.zones.length > 0) {
          console.log(`   🏠 Зоны (${site.zones.length}):`);
          site.zones.forEach((zone, zIndex) => {
            console.log(`      ${zIndex + 1}. ${zone.name}`);
            if (zone.roomGroups.length > 0) {
              console.log(`         📦 Группы помещений (${zone.roomGroups.length}):`);
              zone.roomGroups.forEach((roomGroup, rgIndex) => {
                console.log(`            ${rgIndex + 1}. ${roomGroup.name}`);
                if (roomGroup.rooms.length > 0) {
                  console.log(`               🚪 Помещения (${roomGroup.rooms.length}):`);
                  roomGroup.rooms.forEach((room, rIndex) => {
                    console.log(`                  ${rIndex + 1}. ${room.name}`);
                  });
                }
              });
            }
          });
        } else {
          console.log(`   🏠 Зон: нет`);
        }
      });
    } else {
      console.log('\n🗺️ УЧАСТКИ: отсутствуют');
    }

    if (yugServisObject.rooms.length > 0) {
      console.log(`\n🚪 ПОМЕЩЕНИЯ ОБЪЕКТА (${yugServisObject.rooms.length}):`);
      yugServisObject.rooms.forEach((room, index) => {
        console.log(`${index + 1}. ${room.name}`);
      });
    }

    if (yugServisObject.techCards.length > 0) {
      console.log(`\n🔧 ТЕХКАРТЫ (${yugServisObject.techCards.length}):`);
      yugServisObject.techCards.slice(0, 10).forEach((techCard, index) => {
        console.log(`${index + 1}. ${techCard.taskName}`);
        console.log(`   📅 Периодичность: ${techCard.frequency}`);
        console.log(`   🏷️ Тип: ${techCard.workType}`);
      });
      if (yugServisObject.techCards.length > 10) {
        console.log(`   ... и еще ${yugServisObject.techCards.length - 10} техкарт`);
      }
    }

    // Проверяем, есть ли данные в структуре
    const hasStructure = yugServisObject.sites.some(site => 
      site.zones.length > 0 && site.zones.some(zone => 
        zone.roomGroups.length > 0 && zone.roomGroups.some(rg => rg.rooms.length > 0)
      )
    );

    console.log('\n📋 АНАЛИЗ СТРУКТУРЫ:');
    console.log('='.repeat(25));
    
    if (hasStructure) {
      console.log('✅ Структура присутствует: Объект → Участки → Зоны → Помещения');
    } else if (yugServisObject.sites.length > 0) {
      console.log('⚠️ Частичная структура: есть участки, но нет зон/помещений');
    } else if (yugServisObject.rooms.length > 0) {
      console.log('⚠️ Старая структура: есть помещения напрямую в объекте');
    } else {
      console.log('❌ Структура отсутствует: нет участков, зон и помещений');
    }

    console.log('\n🎯 РЕКОМЕНДАЦИИ:');
    if (!hasStructure) {
      console.log('📝 Необходимо создать правильную структуру на основе предоставленных данных');
      console.log('🏗️ Создать участки по адресам');
      console.log('🏠 Создать зоны "места общего пользования и придомовые территории"');
      console.log('🚪 Создать помещения по типам работ');
      console.log('🔧 Привязать техкарты к соответствующим помещениям');
    } else {
      console.log('✅ Структура в порядке');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkYugServisData();
