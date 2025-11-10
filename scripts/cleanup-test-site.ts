import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestSite() {
  console.log('🗑️  УДАЛЕНИЕ ТЕСТОВОГО УЧАСТКА\n');
  
  const object = await prisma.cleaningObject.findFirst({
    where: {
      name: {
        contains: 'ГК «Электрощит»',
        mode: 'insensitive'
      }
    }
  });
  
  if (!object) {
    console.log('❌ Объект не найден');
    await prisma.$disconnect();
    return;
  }
  
  // Находим тестовый участок
  const testSite = await prisma.site.findFirst({
    where: {
      name: {
        contains: 'ТЕСТ:',
        mode: 'insensitive'
      },
      objectId: object.id
    },
    include: {
      zones: {
        include: {
          roomGroups: {
            include: {
              rooms: {
                include: {
                  techCards: true,
                  cleaningObjects: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (!testSite) {
    console.log('❌ Тестовый участок не найден');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Найден тестовый участок: ${testSite.name}\n`);
  
  // Удаляем в обратном порядке
  for (const zone of testSite.zones) {
    for (const group of zone.roomGroups) {
      for (const room of group.rooms) {
        // Удаляем техкарты
        const techCardsCount = await prisma.techCard.deleteMany({
          where: { roomId: room.id }
        });
        console.log(`   🗑️  Удалено техкарт: ${techCardsCount.count}`);
        
        // Удаляем объекты уборки
        const cleaningObjectsCount = await prisma.cleaningObjectItem.deleteMany({
          where: { roomId: room.id }
        });
        if (cleaningObjectsCount.count > 0) {
          console.log(`   🗑️  Удалено объектов уборки: ${cleaningObjectsCount.count}`);
        }
        
        // Удаляем помещение
        await prisma.room.delete({ where: { id: room.id } });
      }
      
      // Удаляем группу
      await prisma.roomGroup.delete({ where: { id: group.id } });
    }
    
    // Удаляем зону
    await prisma.zone.delete({ where: { id: zone.id } });
  }
  
  // Удаляем участок
  await prisma.site.delete({ where: { id: testSite.id } });
  
  console.log(`\n✅ Тестовый участок "${testSite.name}" удален!\n`);
  
  await prisma.$disconnect();
}

cleanupTestSite().catch(console.error);
