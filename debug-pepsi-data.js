const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugPepsiData() {
  try {
    console.log('🔍 ОТЛАДКА ДАННЫХ ПЕПСИ');
    console.log('=======================\n');

    // Найдем все объекты с "Пепси" в названии
    const pepsiObjects = await prisma.cleaningObject.findMany({
      where: { 
        name: { 
          contains: 'Пепси',
          mode: 'insensitive'
        }
      }
    });

    console.log(`📊 Найдено объектов с "Пепси": ${pepsiObjects.length}`);
    pepsiObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name} (ID: ${obj.id})`);
    });

    // Возьмем первый объект
    if (pepsiObjects.length === 0) {
      console.log('❌ Объекты Пепси не найдены');
      return;
    }

    const pepsiObject = pepsiObjects[0];
    console.log(`\n🎯 Анализируем: ${pepsiObject.name}`);

    // Проверим данные в плоской таблице
    const structureRecords = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObject.id },
      take: 10
    });

    console.log(`\n📋 Записей в ObjectStructure: ${structureRecords.length}`);
    
    if (structureRecords.length > 0) {
      console.log('\n📝 ПРИМЕРЫ ЗАПИСЕЙ:');
      structureRecords.slice(0, 5).forEach((record, index) => {
        console.log(`\n${index + 1}. Техкарта: ${record.techCardName}`);
        console.log(`   Объект: ${record.objectName}`);
        console.log(`   Участок: ${record.siteName || 'НЕТ'}`);
        console.log(`   Зона: ${record.zoneName || 'НЕТ'}`);
        console.log(`   Группа: ${record.roomGroupName || 'НЕТ'}`);
        console.log(`   Помещение: ${record.roomName || 'НЕТ'}`);
        console.log(`   Объект уборки: ${record.cleaningObjectName || 'НЕТ'}`);
      });
    } else {
      console.log('❌ Записи в ObjectStructure не найдены');
      
      // Проверим старую структуру
      console.log('\n🔍 ПРОВЕРЯЕМ СТАРУЮ СТРУКТУРУ:');
      
      const sites = await prisma.site.findMany({
        where: { objectId: pepsiObject.id },
        include: {
          zones: {
            include: {
              roomGroups: {
                include: {
                  rooms: {
                    include: {
                      techCards: true,
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
      });

      console.log(`Участков: ${sites.length}`);
      sites.forEach(site => {
        console.log(`  📍 ${site.name} (${site.zones.length} зон)`);
        site.zones.forEach(zone => {
          console.log(`    🏗️ ${zone.name} (${zone.roomGroups.length} групп)`);
          zone.roomGroups.forEach(rg => {
            console.log(`      📦 ${rg.name} (${rg.rooms.length} помещений)`);
            rg.rooms.forEach(room => {
              console.log(`        🏠 ${room.name} (${room.techCards.length} техкарт, ${room.cleaningObjects.length} объектов уборки)`);
            });
          });
        });
      });
    }

  } catch (error) {
    console.error('❌ Ошибка при отладке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPepsiData();
