import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDbState() {
  console.log('📊 ПРОВЕРКА СОСТОЯНИЯ БАЗЫ ДАННЫХ\n');
  
  // Объекты
  const objects = await prisma.cleaningObject.count();
  const objectsWithManager = await prisma.cleaningObject.count({
    where: { managerId: { not: null } }
  });
  
  console.log('🏢 ОБЪЕКТЫ:');
  console.log(`   Всего: ${objects}`);
  console.log(`   С менеджером: ${objectsWithManager}`);
  console.log(`   Без менеджера: ${objects - objectsWithManager}\n`);
  
  // Менеджеры
  const managers = await prisma.user.count({
    where: { role: 'MANAGER' }
  });
  
  console.log('👤 МЕНЕДЖЕРЫ:');
  console.log(`   Всего: ${managers}\n`);
  
  // Иерархия
  const sites = await prisma.site.count();
  const virtualSites = await prisma.site.count({
    where: { name: '__VIRTUAL__' }
  });
  
  const zones = await prisma.zone.count();
  const virtualZones = await prisma.zone.count({
    where: { name: '__VIRTUAL__' }
  });
  
  const roomGroups = await prisma.roomGroup.count();
  const topLevelGroups = await prisma.roomGroup.count({
    where: { description: 'TOP_LEVEL' }
  });
  
  const rooms = await prisma.room.count();
  const virtualRooms = await prisma.room.count({
    where: { name: '__VIRTUAL__' }
  });
  
  const cleaningItems = await prisma.cleaningObjectItem.count();
  const techCards = await prisma.techCard.count();
  
  console.log('📍 ИЕРАРХИЯ:');
  console.log(`   Участков: ${sites} (виртуальных: ${virtualSites})`);
  console.log(`   Зон: ${zones} (виртуальных: ${virtualZones})`);
  console.log(`   Групп помещений: ${roomGroups} (верхний уровень: ${topLevelGroups})`);
  console.log(`   Помещений: ${rooms} (виртуальных: ${virtualRooms})`);
  console.log(`   Объектов уборки: ${cleaningItems}`);
  console.log(`   Техкарт: ${techCards}\n`);
  
  // Список объектов
  const allObjects = await prisma.cleaningObject.findMany({
    include: {
      manager: true,
      _count: {
        select: {
          sites: true,
          rooms: true,
          techCards: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log('📋 СПИСОК ОБЪЕКТОВ:\n');
  allObjects.forEach((obj, i) => {
    console.log(`${i + 1}. ${obj.name}`);
    console.log(`   Адрес: ${obj.address || 'не указан'}`);
    console.log(`   Менеджер: ${obj.manager?.name || 'НЕ НАЗНАЧЕН ❌'}`);
    console.log(`   Участков: ${obj._count.sites}`);
    console.log(`   Помещений: ${obj._count.rooms}`);
    console.log(`   Техкарт: ${obj._count.techCards}\n`);
  });
  
  console.log('='.repeat(70));
  console.log('✅ БАЗА ДАННЫХ ГОТОВА К ЗАГРУЗКЕ НОВЫХ ОБЪЕКТОВ');
  console.log('='.repeat(70));
  console.log('\n💡 Можно продолжать загрузку по одному объекту через Excel\n');
  
  await prisma.$disconnect();
}

checkDbState().catch(console.error);
