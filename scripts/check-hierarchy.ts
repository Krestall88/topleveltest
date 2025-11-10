import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ПРОВЕРКА ИЕРАРХИИ ДАННЫХ\n');
  console.log('='.repeat(70) + '\n');
  
  const objects = await prisma.cleaningObject.findMany({
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
      rooms: true,
      techCards: true,
    }
  });
  
  console.log(`📊 Всего объектов: ${objects.length}\n`);
  
  let totalSites = 0;
  let totalZones = 0;
  let totalRoomGroups = 0;
  let totalRooms = 0;
  let totalTechCards = 0;
  
  for (const obj of objects) {
    const sitesCount = obj.sites.length;
    totalSites += sitesCount;
    
    let zonesCount = 0;
    let roomGroupsCount = 0;
    let roomsInHierarchy = 0;
    
    obj.sites.forEach(site => {
      zonesCount += site.zones.length;
      site.zones.forEach(zone => {
        roomGroupsCount += zone.roomGroups.length;
        zone.roomGroups.forEach(group => {
          roomsInHierarchy += group.rooms.length;
        });
      });
    });
    
    totalZones += zonesCount;
    totalRoomGroups += roomGroupsCount;
    totalRooms += obj.rooms.length;
    totalTechCards += obj.techCards.length;
    
    console.log(`🏢 ${obj.name}`);
    console.log(`   📍 Участков: ${sitesCount}`);
    console.log(`   🏗️  Зон: ${zonesCount}`);
    console.log(`   📦 Групп помещений: ${roomGroupsCount}`);
    console.log(`   🚪 Помещений в иерархии: ${roomsInHierarchy}`);
    console.log(`   🚪 Всего помещений: ${obj.rooms.length}`);
    console.log(`   📋 Техкарт: ${obj.techCards.length}`);
    
    // Проверяем структуру
    if (sitesCount > 0 && zonesCount === 0) {
      console.log(`   ⚠️  ПРОБЛЕМА: Есть участки, но нет зон!`);
    }
    if (zonesCount > 0 && roomGroupsCount === 0) {
      console.log(`   ⚠️  ПРОБЛЕМА: Есть зоны, но нет групп помещений!`);
    }
    if (roomGroupsCount > 0 && roomsInHierarchy === 0) {
      console.log(`   ⚠️  ПРОБЛЕМА: Есть группы помещений, но нет помещений в них!`);
    }
    
    console.log();
  }
  
  console.log('='.repeat(70));
  console.log('📊 ИТОГО:');
  console.log('='.repeat(70));
  console.log(`  📍 Участков: ${totalSites}`);
  console.log(`  🏗️  Зон: ${totalZones}`);
  console.log(`  📦 Групп помещений: ${totalRoomGroups}`);
  console.log(`  🚪 Помещений: ${totalRooms}`);
  console.log(`  📋 Техкарт: ${totalTechCards}`);
  console.log('='.repeat(70) + '\n');
  
  // Детальная проверка по одному объекту
  console.log('🔎 ДЕТАЛЬНАЯ ПРОВЕРКА (первый объект с иерархией):\n');
  
  const detailedObject = objects.find(o => o.sites.length > 0);
  
  if (detailedObject) {
    console.log(`🏢 ${detailedObject.name}\n`);
    
    for (const site of detailedObject.sites.slice(0, 3)) {
      console.log(`  📍 Участок: ${site.name}`);
      
      for (const zone of site.zones.slice(0, 2)) {
        console.log(`    🏗️  Зона: ${zone.name}`);
        
        for (const group of zone.roomGroups.slice(0, 2)) {
          console.log(`      📦 Группа: ${group.name}`);
          console.log(`         🚪 Помещений: ${group.rooms.length}`);
          
          for (const room of group.rooms.slice(0, 2)) {
            console.log(`           - ${room.name}`);
          }
        }
      }
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
