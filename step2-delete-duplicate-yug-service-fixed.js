const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteDuplicateYugService() {
  console.log('🗑️ УДАЛЕНИЕ ДУБЛИРУЮЩЕГО ОБЪЕКТА ЮГ-СЕРВИСА (ИСПРАВЛЕННАЯ ВЕРСИЯ)\n');
  
  try {
    const objectToDeleteId = 'cmgzsv7ho0001vys41jpmf7uy'; // ООО «Юг-Сервис»
    const objectToKeepId = 'cmgyu7kxr036zvyjomsbe8fp6';   // УК Юг-сервис
    
    console.log(`🎯 Удаляем объект: ООО «Юг-Сервис» (ID: ${objectToDeleteId})`);
    console.log(`✅ Оставляем объект: УК Юг-сервис (ID: ${objectToKeepId})\n`);
    
    // Сначала проверим, что объект существует
    const objectToDelete = await prisma.cleaningObject.findUnique({
      where: { id: objectToDeleteId },
      include: {
        sites: {
          include: {
            zones: true // Зоны связаны с участками, не с помещениями
          }
        },
        rooms: {
          include: {
            roomGroups: {
              include: {
                zones: true // Зоны связаны через roomGroups
              }
            }
          }
        },
        techCards: true,
        checklists: true,
        _count: {
          select: {
            sites: true,
            rooms: true,
            techCards: true,
            checklists: true
          }
        }
      }
    });
    
    if (!objectToDelete) {
      console.log('❌ Объект для удаления не найден');
      return;
    }
    
    console.log('📊 Что будет удалено:');
    console.log(`   - Участков: ${objectToDelete._count.sites}`);
    console.log(`   - Помещений: ${objectToDelete._count.rooms}`);
    console.log(`   - Техкарт: ${objectToDelete._count.techCards}`);
    console.log(`   - Чек-листов: ${objectToDelete._count.checklists}`);
    
    // Проверяем, есть ли участки с менеджерами (их не должно быть по анализу)
    const sitesWithManagers = objectToDelete.sites.filter(site => site.managerId);
    if (sitesWithManagers.length > 0) {
      console.log(`\n⚠️ ВНИМАНИЕ: Найдены участки с менеджерами (${sitesWithManagers.length})`);
      console.log('Сначала нужно перенести эти данные!');
      return;
    }
    
    console.log('\n🚀 Начинаем удаление...');
    
    // Удаляем в правильном порядке (из-за внешних ключей)
    
    // 1. Удаляем чек-листы
    if (objectToDelete._count.checklists > 0) {
      const deletedChecklists = await prisma.checklist.deleteMany({
        where: { objectId: objectToDeleteId }
      });
      console.log(`✅ Удалено чек-листов: ${deletedChecklists.count}`);
    }
    
    // 2. Удаляем техкарты
    if (objectToDelete._count.techCards > 0) {
      const deletedTechCards = await prisma.techCard.deleteMany({
        where: { objectId: objectToDeleteId }
      });
      console.log(`✅ Удалено техкарт: ${deletedTechCards.count}`);
    }
    
    // 3. Удаляем зоны из помещений (через roomGroups)
    let totalDeletedZones = 0;
    if (objectToDelete._count.rooms > 0) {
      for (const room of objectToDelete.rooms) {
        for (const roomGroup of room.roomGroups) {
          if (roomGroup.zones.length > 0) {
            const deletedZones = await prisma.zone.deleteMany({
              where: { 
                id: { in: roomGroup.zones.map(zone => zone.id) }
              }
            });
            totalDeletedZones += deletedZones.count;
          }
        }
      }
      console.log(`✅ Удалено зон из помещений: ${totalDeletedZones}`);
      
      // Удаляем roomGroups
      let totalDeletedRoomGroups = 0;
      for (const room of objectToDelete.rooms) {
        if (room.roomGroups.length > 0) {
          const deletedRoomGroups = await prisma.roomGroup.deleteMany({
            where: { roomId: room.id }
          });
          totalDeletedRoomGroups += deletedRoomGroups.count;
        }
      }
      console.log(`✅ Удалено групп помещений: ${totalDeletedRoomGroups}`);
      
      // Затем удаляем помещения
      const deletedRooms = await prisma.room.deleteMany({
        where: { objectId: objectToDeleteId }
      });
      console.log(`✅ Удалено помещений: ${deletedRooms.count}`);
    }
    
    // 4. Удаляем зоны из участков
    let totalDeletedSiteZones = 0;
    if (objectToDelete._count.sites > 0) {
      for (const site of objectToDelete.sites) {
        if (site.zones.length > 0) {
          const deletedZones = await prisma.zone.deleteMany({
            where: { 
              id: { in: site.zones.map(zone => zone.id) }
            }
          });
          totalDeletedSiteZones += deletedZones.count;
        }
      }
      console.log(`✅ Удалено зон из участков: ${totalDeletedSiteZones}`);
      
      // Затем удаляем участки
      const deletedSites = await prisma.site.deleteMany({
        where: { objectId: objectToDeleteId }
      });
      console.log(`✅ Удалено участков: ${deletedSites.count}`);
    }
    
    // 5. Наконец, удаляем сам объект
    await prisma.cleaningObject.delete({
      where: { id: objectToDeleteId }
    });
    console.log(`✅ Удален объект: ${objectToDelete.name}`);
    
    console.log('\n🎉 УДАЛЕНИЕ ЗАВЕРШЕНО УСПЕШНО!');
    
    // Проверяем, что остался только один объект
    const remainingYugObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      }
    });
    
    console.log(`\n📋 Проверка: осталось объектов Юг-сервиса: ${remainingYugObjects.length}`);
    remainingYugObjects.forEach(obj => {
      console.log(`   ✅ ${obj.name} (ID: ${obj.id})`);
    });
    
  } catch (error) {
    console.error('💥 Ошибка при удалении:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDuplicateYugService();
