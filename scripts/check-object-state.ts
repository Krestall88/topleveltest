import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkObjectState() {
  const objectName = '«Желдорпроект Поволжья» - филиала АО «Росжелдорпроект»';
  
  console.log(`🔍 Проверка состояния объекта: "${objectName}"\n`);
  
  const object = await prisma.cleaningObject.findFirst({
    where: { name: objectName },
    include: {
      manager: true,
      sites: {
        include: {
          zones: {
            include: {
              roomGroups: true
            }
          }
        }
      },
      rooms: true,
      techCards: true
    }
  });
  
  // Получаем объекты уборки отдельно
  const cleaningItems = await prisma.cleaningObjectItem.findMany({
    where: {
      room: {
        objectId: object?.id
      }
    }
  });
  
  if (!object) {
    console.log('❌ Объект не найден в базе данных\n');
    return;
  }
  
  console.log('✅ Объект найден:\n');
  console.log(`📋 Основная информация:`);
  console.log(`   ID: ${object.id}`);
  console.log(`   Название: ${object.name}`);
  console.log(`   Адрес: ${object.address || 'не указан'}`);
  console.log(`   Менеджер: ${object.manager?.name || 'НЕ ПРИВЯЗАН ❌'}`);
  console.log(`   Дата создания: ${object.createdAt.toLocaleDateString('ru-RU')}\n`);
  
  console.log(`📊 Структура:`);
  console.log(`   Участков: ${object.sites.length}`);
  
  let totalZones = 0;
  let totalRoomGroups = 0;
  object.sites.forEach(site => {
    totalZones += site.zones.length;
    site.zones.forEach(zone => {
      totalRoomGroups += zone.roomGroups.length;
    });
  });
  
  console.log(`   Зон: ${totalZones}`);
  console.log(`   Групп помещений: ${totalRoomGroups}`);
  console.log(`   Помещений: ${object.rooms.length}`);
  console.log(`   Объектов уборки: ${cleaningItems.length}`);
  console.log(`   Техкарт: ${object.techCards.length}\n`);
  
  if (object.sites.length > 0) {
    console.log('📍 Участки:');
    object.sites.forEach((site, i) => {
      console.log(`   ${i + 1}. ${site.name} (${site.zones.length} зон)`);
      site.zones.forEach((zone, j) => {
        console.log(`      ${i + 1}.${j + 1}. ${zone.name} (${zone.roomGroups.length} групп)`);
      });
    });
    console.log();
  }
  
  if (object.techCards.length > 0) {
    console.log(`📋 Техкарты (показаны первые 10 из ${object.techCards.length}):`);
    object.techCards.slice(0, 10).forEach((tc, i) => {
      console.log(`   ${i + 1}. ${tc.name}`);
      console.log(`      Периодичность: ${tc.frequency || 'не указана'}`);
      console.log(`      Помещение: ${tc.roomId ? 'привязано' : 'НЕ привязано'}`);
      console.log(`      Объект уборки: ${tc.cleaningObjectItemId ? 'привязан' : 'НЕ привязан'}`);
    });
  }
  
  await prisma.$disconnect();
}

checkObjectState().catch(console.error);
