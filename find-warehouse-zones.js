const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findWarehouseZones() {
  try {
    console.log('🔍 ПОИСК ЗОН СО СКЛАДАМИ');
    console.log('========================\n');

    // Получаем объект Пепси
    const pepsiObject = await prisma.cleaningObject.findFirst({
      where: { name: { contains: 'Пепси' } }
    });

    if (!pepsiObject) {
      console.log('❌ Объект Пепси не найден');
      return;
    }

    console.log(`🏢 Объект: ${pepsiObject.name}`);
    console.log(`   ID: ${pepsiObject.id}\n`);

    // Получаем все уникальные зоны
    const zones = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObject.id },
      select: {
        zoneName: true,
        siteName: true
      },
      distinct: ['zoneName']
    });

    console.log('📍 ВСЕ ЗОНЫ В ОБЪЕКТЕ:');
    console.log('=====================');
    zones.forEach((zone, index) => {
      if (zone.zoneName) {
        console.log(`${index + 1}. ${zone.zoneName}`);
      }
    });

    // Ищем зоны со словом "склад"
    console.log('\n🏪 ЗОНЫ СО СКЛАДАМИ:');
    console.log('====================');
    const warehouseZones = zones.filter(z => 
      z.zoneName && z.zoneName.toLowerCase().includes('склад')
    );

    if (warehouseZones.length > 0) {
      warehouseZones.forEach((zone, index) => {
        console.log(`${index + 1}. ${zone.zoneName}`);
      });
    } else {
      console.log('❌ Зоны со складами не найдены');
    }

    // Ищем по номеру зоны
    console.log('\n🔢 ЗОНЫ С НОМЕРАМИ:');
    console.log('===================');
    const numberedZones = zones.filter(z => 
      z.zoneName && /зона\s*\d+/i.test(z.zoneName)
    );

    numberedZones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.zoneName}`);
    });

    // Поиск по ключевым словам
    console.log('\n🔍 ПОИСК ПО КЛЮЧЕВЫМ СЛОВАМ:');
    console.log('============================');
    
    const keywords = ['склад', 'сырь', 'продукц', 'хранен', 'запас'];
    
    keywords.forEach(keyword => {
      const found = zones.filter(z => 
        z.zoneName && z.zoneName.toLowerCase().includes(keyword)
      );
      
      if (found.length > 0) {
        console.log(`\n"${keyword}": ${found.length} зон`);
        found.forEach(zone => {
          console.log(`  - ${zone.zoneName}`);
        });
      }
    });

    // Получаем группы помещений
    console.log('\n📦 ГРУППЫ ПОМЕЩЕНИЙ:');
    console.log('===================');
    const roomGroups = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObject.id },
      select: {
        roomGroupName: true,
        zoneName: true
      },
      distinct: ['roomGroupName']
    });

    const warehouseGroups = roomGroups.filter(rg => 
      rg.roomGroupName && rg.roomGroupName.toLowerCase().includes('склад')
    );

    if (warehouseGroups.length > 0) {
      console.log('Группы помещений со складами:');
      warehouseGroups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.roomGroupName} (Зона: ${group.zoneName})`);
      });
    } else {
      console.log('❌ Группы помещений со складами не найдены');
    }

  } catch (error) {
    console.error('❌ Ошибка при поиске:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findWarehouseZones();
