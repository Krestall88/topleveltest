import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ТЕСТ СЦЕНАРИЯ: ТОЛЬКО УЧАСТОК И ТЕХКАРТА
 * 
 * Проверяем что виртуальные уровни (зона, группа, помещение) скрываются в UI
 */

async function testSiteOnlyScenario() {
  console.log('🧪 ТЕСТ: Участок + Техкарта\n');
  console.log('='.repeat(70));
  
  // Находим существующий объект
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
  
  console.log(`✅ Найден объект: ${object.name}\n`);
  
  // Создаем тестовый участок с техкартой
  console.log('📝 Создаем тестовый участок "Места общего пользования"...\n');
  
  const site = await prisma.site.create({
    data: {
      name: 'ТЕСТ: Места общего пользования',
      objectId: object.id,
      comment: 'Тестовый участок'
    }
  });
  
  console.log(`✅ Создан участок: ${site.name}`);
  
  // Создаем виртуальную зону (требуется для БД)
  const zone = await prisma.zone.create({
    data: {
      name: '__VIRTUAL__',
      siteId: site.id
    }
  });
  
  console.log(`🔹 Создана виртуальная зона (скрыта)`);
  
  // Создаем виртуальную группу
  const group = await prisma.roomGroup.create({
    data: {
      name: '__VIRTUAL__',
      zoneId: zone.id,
      description: 'Виртуальная группа'
    }
  });
  
  console.log(`🔹 Создана виртуальная группа (скрыта)`);
  
  // Создаем виртуальное помещение
  const room = await prisma.room.create({
    data: {
      name: '__VIRTUAL__',
      objectId: object.id,
      roomGroupId: group.id,
      description: 'Виртуальное помещение'
    }
  });
  
  console.log(`🔹 Создано виртуальное помещение (скрыто)`);
  
  // Создаем техкарты
  const techCards = [
    'Мытье окон',
    'Мытье лестничных площадок',
    'Влажная протирка подоконников'
  ];
  
  for (const cardName of techCards) {
    await prisma.techCard.create({
      data: {
        name: cardName,
        workType: 'Уборка',
        frequency: '1 раз в месяц',
        objectId: object.id,
        roomId: room.id
      }
    });
    console.log(`   🔧 Создана техкарта: ${cardName}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 ПРОВЕРКА СТРУКТУРЫ В БД:\n');
  
  // Проверяем структуру
  const fullSite = await prisma.site.findUnique({
    where: { id: site.id },
    include: {
      zones: {
        include: {
          roomGroups: {
            include: {
              rooms: {
                include: {
                  techCards: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  console.log(`Участок: ${fullSite?.name}`);
  console.log(`  └─ Зон: ${fullSite?.zones.length} (${fullSite?.zones[0]?.name})`);
  console.log(`     └─ Групп: ${fullSite?.zones[0]?.roomGroups.length} (${fullSite?.zones[0]?.roomGroups[0]?.name})`);
  console.log(`        └─ Помещений: ${fullSite?.zones[0]?.roomGroups[0]?.rooms.length} (${fullSite?.zones[0]?.roomGroups[0]?.rooms[0]?.name})`);
  console.log(`           └─ Техкарт: ${fullSite?.zones[0]?.roomGroups[0]?.rooms[0]?.techCards.length}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 ОЖИДАЕМОЕ ОТОБРАЖЕНИЕ В UI:\n');
  console.log(`Участок: ТЕСТ: Места общего пользования`);
  console.log(`  └─ Мытье окон`);
  console.log(`  └─ Мытье лестничных площадок`);
  console.log(`  └─ Влажная протирка подоконников`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✅ ТЕСТ ЗАВЕРШЕН!');
  console.log('\n📝 Проверьте в UI:');
  console.log('   1. Откройте объект "АО «ГК «Электрощит» -ТМ Самара»"');
  console.log('   2. Найдите участок "ТЕСТ: Места общего пользования"');
  console.log('   3. Убедитесь что техкарты показываются НАПРЯМУЮ под участком');
  console.log('   4. Виртуальные уровни (зона, группа, помещение) должны быть СКРЫТЫ');
  
  console.log('\n🗑️  Для удаления тестовых данных запустите:');
  console.log('   npx tsx scripts/cleanup-test-site.ts');
  
  await prisma.$disconnect();
}

testSiteOnlyScenario().catch(console.error);
