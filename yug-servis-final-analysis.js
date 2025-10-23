const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function yugServisFinalAnalysis() {
  try {
    console.log('📊 ФИНАЛЬНЫЙ АНАЛИЗ УК ЮГ-СЕРВИС');
    console.log('=================================\n');

    // Получаем оба объекта
    const objects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
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
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📋 Найдено объектов УК Юг-сервис: ${objects.length}\n`);

    // Анализируем каждый объект
    objects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   🆔 ID: ${obj.id}`);
      console.log(`   📅 Создан: ${obj.createdAt.toLocaleString('ru-RU')}`);
      console.log(`   👤 Менеджер: ${obj.manager?.name || 'не назначен'}`);
      console.log(`   🗺️ Участков: ${obj.sites.length}`);
      console.log(`   🚪 Помещений: ${obj._count.rooms}`);
      console.log(`   🔧 Техкарт: ${obj._count.techCards}`);

      // Анализируем структуру
      const totalZones = obj.sites.reduce((sum, site) => sum + site.zones.length, 0);
      const totalRoomGroups = obj.sites.reduce((sum, site) => 
        sum + site.zones.reduce((zSum, zone) => zSum + zone.roomGroups.length, 0), 0);
      const totalRoomsInStructure = obj.sites.reduce((sum, site) => 
        sum + site.zones.reduce((zSum, zone) => 
          zSum + zone.roomGroups.reduce((rgSum, rg) => rgSum + rg.rooms.length, 0), 0), 0);

      console.log(`   🏠 Зон: ${totalZones}`);
      console.log(`   📦 Групп помещений: ${totalRoomGroups}`);
      console.log(`   🏠 Помещений в структуре: ${totalRoomsInStructure}`);

      // Определяем тип структуры
      const hasMultiLevel = obj.sites.some(site => 
        site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
      );

      if (hasMultiLevel) {
        console.log(`   📊 Тип: ✅ МНОГОУРОВНЕВАЯ СТРУКТУРА`);
      } else if (obj.sites.length > 0) {
        console.log(`   📊 Тип: ⚠️ ТОЛЬКО УЧАСТКИ`);
      } else {
        console.log(`   📊 Тип: ❌ ПУСТАЯ`);
      }

      console.log('');
    });

    // Создаем рекомендации
    console.log('🎯 РЕКОМЕНДАЦИИ:');
    console.log('='.repeat(20));

    if (objects.length > 1) {
      // Находим лучший объект
      const bestObject = objects.reduce((best, current) => {
        const bestHasMultiLevel = best.sites.some(site => 
          site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
        );
        const currentHasMultiLevel = current.sites.some(site => 
          site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
        );

        // Приоритет: многоуровневая структура > количество техкарт > дата создания
        if (currentHasMultiLevel && !bestHasMultiLevel) return current;
        if (bestHasMultiLevel && !currentHasMultiLevel) return best;
        
        return current._count.techCards > best._count.techCards ? current : best;
      });

      const objectsToRemove = objects.filter(obj => obj.id !== bestObject.id);

      console.log(`✅ РЕКОМЕНДУЕТСЯ ОСТАВИТЬ:`);
      console.log(`   ${bestObject.name} (ID: ${bestObject.id})`);
      console.log(`   Причина: лучшая структура и актуальные данные\n`);

      console.log(`🗑️ РЕКОМЕНДУЕТСЯ УДАЛИТЬ:`);
      objectsToRemove.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name} (ID: ${obj.id})`);
        console.log(`      Причина: дубль с менее актуальной структурой`);
      });

      console.log('\n📋 ПЛАН ДЕЙСТВИЙ:');
      console.log('1. Использовать новое модальное окно редактирования для управления объектами');
      console.log('2. При необходимости перенести важные данные со старого объекта на новый');
      console.log('3. Удалить дублирующий объект через интерфейс');
      console.log('4. Проверить корректность отображения структуры в системе');
    }

    // Создаем отчет
    const report = {
      timestamp: new Date().toISOString(),
      totalObjects: objects.length,
      objects: objects.map(obj => ({
        id: obj.id,
        name: obj.name,
        createdAt: obj.createdAt,
        manager: obj.manager?.name,
        structure: {
          sites: obj.sites.length,
          zones: obj.sites.reduce((sum, site) => sum + site.zones.length, 0),
          roomGroups: obj.sites.reduce((sum, site) => 
            sum + site.zones.reduce((zSum, zone) => zSum + zone.roomGroups.length, 0), 0),
          roomsInStructure: obj.sites.reduce((sum, site) => 
            sum + site.zones.reduce((zSum, zone) => 
              zSum + zone.roomGroups.reduce((rgSum, rg) => rgSum + rg.rooms.length, 0), 0), 0),
          directRooms: obj._count.rooms,
          techCards: obj._count.techCards
        },
        hasMultiLevelStructure: obj.sites.some(site => 
          site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
        )
      })),
      recommendation: objects.length > 1 ? {
        keepObjectId: objects.reduce((best, current) => {
          const bestHasMultiLevel = best.sites.some(site => 
            site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
          );
          const currentHasMultiLevel = current.sites.some(site => 
            site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
          );
          if (currentHasMultiLevel && !bestHasMultiLevel) return current;
          if (bestHasMultiLevel && !currentHasMultiLevel) return best;
          return current._count.techCards > best._count.techCards ? current : best;
        }).id,
        removeObjectIds: objects.filter(obj => 
          obj.id !== objects.reduce((best, current) => {
            const bestHasMultiLevel = best.sites.some(site => 
              site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
            );
            const currentHasMultiLevel = current.sites.some(site => 
              site.zones.some(zone => zone.roomGroups.some(rg => rg.rooms.length > 0))
            );
            if (currentHasMultiLevel && !bestHasMultiLevel) return current;
            if (bestHasMultiLevel && !currentHasMultiLevel) return best;
            return current._count.techCards > best._count.techCards ? current : best;
          }).id
        ).map(obj => obj.id)
      } : null
    };

    fs.writeFileSync('yug-servis-analysis.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Анализ сохранен в yug-servis-analysis.json');

    console.log('\n🎉 АНАЛИЗ ЗАВЕРШЕН!');
    console.log('✅ Функционал редактирования объектов создан');
    console.log('✅ Структура УК Юг-сервис проанализирована');
    console.log('✅ Рекомендации по управлению дублями предоставлены');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

yugServisFinalAnalysis();
