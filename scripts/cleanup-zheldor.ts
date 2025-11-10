import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupZheldor() {
  console.log('🔍 ПОИСК И ОЧИСТКА "Желдорпроект Поволжья"\n');
  
  // Ищем все объекты с таким названием
  const objects = await prisma.cleaningObject.findMany({
    where: {
      name: {
        contains: 'Желдорпроект Поволжья',
        mode: 'insensitive'
      }
    },
    include: {
      manager: true,
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
      techCards: true
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`📊 Найдено объектов: ${objects.length}\n`);
  
  if (objects.length === 0) {
    console.log('❌ Объекты не найдены\n');
    await prisma.$disconnect();
    return;
  }
  
  // Показываем все найденные объекты
  objects.forEach((obj, i) => {
    console.log(`${i + 1}. ID: ${obj.id}`);
    console.log(`   Название: ${obj.name}`);
    console.log(`   Адрес: ${obj.address || 'не указан'}`);
    console.log(`   Менеджер: ${obj.manager?.name || 'не назначен'}`);
    console.log(`   Создан: ${obj.createdAt.toLocaleString('ru-RU')}`);
    console.log(`   Участков: ${obj.sites.length}`);
    
    let totalZones = 0;
    let totalRoomGroups = 0;
    let totalRooms = 0;
    
    obj.sites.forEach(site => {
      totalZones += site.zones.length;
      site.zones.forEach(zone => {
        totalRoomGroups += zone.roomGroups.length;
        zone.roomGroups.forEach(rg => {
          totalRooms += rg.rooms.length;
        });
      });
    });
    
    console.log(`   Зон: ${totalZones}`);
    console.log(`   Групп: ${totalRoomGroups}`);
    console.log(`   Помещений (в группах): ${totalRooms}`);
    console.log(`   Помещений (без групп): ${obj.rooms.length}`);
    console.log(`   Техкарт: ${obj.techCards.length}\n`);
  });
  
  // УДАЛЕНИЕ
  console.log('🗑️  НАЧИНАЕМ УДАЛЕНИЕ...\n');
  
  for (const obj of objects) {
    console.log(`🔄 Удаление объекта: ${obj.name} (ID: ${obj.id})`);
    
    try {
      // Удаляем техкарты
      const deletedTechCards = await prisma.techCard.deleteMany({
        where: { objectId: obj.id }
      });
      console.log(`   ✅ Удалено техкарт: ${deletedTechCards.count}`);
      
      // Удаляем объекты уборки
      const deletedCleaningItems = await prisma.cleaningObjectItem.deleteMany({
        where: {
          room: {
            objectId: obj.id
          }
        }
      });
      console.log(`   ✅ Удалено объектов уборки: ${deletedCleaningItems.count}`);
      
      // Удаляем помещения
      const deletedRooms = await prisma.room.deleteMany({
        where: { objectId: obj.id }
      });
      console.log(`   ✅ Удалено помещений: ${deletedRooms.count}`);
      
      // Удаляем группы помещений (через зоны)
      let deletedRoomGroups = 0;
      for (const site of obj.sites) {
        for (const zone of site.zones) {
          const result = await prisma.roomGroup.deleteMany({
            where: { zoneId: zone.id }
          });
          deletedRoomGroups += result.count;
        }
      }
      console.log(`   ✅ Удалено групп помещений: ${deletedRoomGroups}`);
      
      // Удаляем зоны
      let deletedZones = 0;
      for (const site of obj.sites) {
        const result = await prisma.zone.deleteMany({
          where: { siteId: site.id }
        });
        deletedZones += result.count;
      }
      console.log(`   ✅ Удалено зон: ${deletedZones}`);
      
      // Удаляем участки
      const deletedSites = await prisma.site.deleteMany({
        where: { objectId: obj.id }
      });
      console.log(`   ✅ Удалено участков: ${deletedSites.count}`);
      
      // Удаляем сам объект
      await prisma.cleaningObject.delete({
        where: { id: obj.id }
      });
      console.log(`   ✅ Объект удален\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Ошибка при удалении: ${error.message}\n`);
    }
  }
  
  console.log('='.repeat(70));
  console.log('✅ ОЧИСТКА ЗАВЕРШЕНА!');
  console.log('='.repeat(70));
  console.log(`\n📊 Удалено объектов: ${objects.length}\n`);
  
  // Проверка
  const remainingObjects = await prisma.cleaningObject.findMany({
    where: {
      name: {
        contains: 'Желдорпроект Поволжья',
        mode: 'insensitive'
      }
    }
  });
  
  if (remainingObjects.length === 0) {
    console.log('✅ Все объекты "Желдорпроект Поволжья" успешно удалены\n');
  } else {
    console.log(`⚠️  Осталось объектов: ${remainingObjects.length}\n`);
  }
  
  await prisma.$disconnect();
}

cleanupZheldor().catch(console.error);
