import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ТЕСТ ВСЕХ ВОЗМОЖНЫХ СЦЕНАРИЕВ ИЕРАРХИИ
 * 
 * Проверяем, что система правильно обрабатывает все комбинации:
 * 1. Полная иерархия: Участок → Зона → Группа → Помещение → Объект уборки → Техкарта
 * 2. Без участка: Зона → Группа → Помещение → Объект уборки → Техкарта
 * 3. Без зоны: Участок → Группа → Помещение → Объект уборки → Техкарта
 * 4. Без группы: Участок → Зона → Помещение → Объект уборки → Техкарта
 * 5. Без помещения: Участок → Зона → Группа → Объект уборки → Техкарта
 * 6. Без объекта уборки: Участок → Зона → Группа → Помещение → Техкарта
 * 7. Только группа и техкарта: Группа → Техкарта
 * 8. Только зона и техкарта: Зона → Техкарта ⚠️ ПРОБЛЕМНЫЙ СЦЕНАРИЙ
 * 9. Только участок и техкарта: Участок → Техкарта
 * 10. Только техкарта: Техкарта
 */

async function testAllScenarios() {
  console.log('🧪 ТЕСТ ВСЕХ СЦЕНАРИЕВ ИЕРАРХИИ\n');
  console.log('='.repeat(70));
  
  const testScenarios = [
    {
      name: '1. Полная иерархия',
      data: {
        siteName: 'Участок 1',
        zoneName: 'Зона 1',
        roomGroupName: 'Группа 1',
        roomName: 'Помещение 1',
        cleaningObject: 'Объект уборки 1',
        techTask: 'Техкарта 1'
      },
      expected: 'Участок → Зона → Группа → Помещение → Объект уборки → Техкарта'
    },
    {
      name: '2. Без участка',
      data: {
        siteName: null,
        zoneName: 'Зона 2',
        roomGroupName: 'Группа 2',
        roomName: 'Помещение 2',
        cleaningObject: 'Объект уборки 2',
        techTask: 'Техкарта 2'
      },
      expected: '[Виртуальный участок] → Зона → Группа → Помещение → Объект уборки → Техкарта'
    },
    {
      name: '3. Без зоны',
      data: {
        siteName: 'Участок 3',
        zoneName: null,
        roomGroupName: 'Группа 3',
        roomName: 'Помещение 3',
        cleaningObject: 'Объект уборки 3',
        techTask: 'Техкарта 3'
      },
      expected: 'Участок → [Виртуальная зона] → Группа → Помещение → Объект уборки → Техкарта'
    },
    {
      name: '4. Без группы',
      data: {
        siteName: 'Участок 4',
        zoneName: 'Зона 4',
        roomGroupName: null,
        roomName: 'Помещение 4',
        cleaningObject: 'Объект уборки 4',
        techTask: 'Техкарта 4'
      },
      expected: 'Участок → Зона → [Виртуальная группа] → Помещение → Объект уборки → Техкарта'
    },
    {
      name: '5. Без помещения',
      data: {
        siteName: 'Участок 5',
        zoneName: 'Зона 5',
        roomGroupName: 'Группа 5',
        roomName: null,
        cleaningObject: 'Объект уборки 5',
        techTask: 'Техкарта 5'
      },
      expected: 'Участок → Зона → Группа → [Виртуальное помещение] → Объект уборки → Техкарта'
    },
    {
      name: '6. Без объекта уборки',
      data: {
        siteName: 'Участок 6',
        zoneName: 'Зона 6',
        roomGroupName: 'Группа 6',
        roomName: 'Помещение 6',
        cleaningObject: null,
        techTask: 'Техкарта 6'
      },
      expected: 'Участок → Зона → Группа → Помещение → Техкарта'
    },
    {
      name: '7. Только группа и техкарта',
      data: {
        siteName: null,
        zoneName: null,
        roomGroupName: 'Группа 7',
        roomName: null,
        cleaningObject: null,
        techTask: 'Техкарта 7'
      },
      expected: '[Виртуальный участок] → [Виртуальная зона] → Группа → [Виртуальное помещение] → Техкарта'
    },
    {
      name: '8. Только зона и техкарта ⚠️',
      data: {
        siteName: null,
        zoneName: 'Зона 8',
        roomGroupName: null,
        roomName: null,
        cleaningObject: null,
        techTask: 'Техкарта 8'
      },
      expected: '[Виртуальный участок] → Зона → [Виртуальная группа] → [Виртуальное помещение] → Техкарта'
    },
    {
      name: '9. Только участок и техкарта',
      data: {
        siteName: 'Участок 9',
        zoneName: null,
        roomGroupName: null,
        roomName: null,
        cleaningObject: null,
        techTask: 'Техкарта 9'
      },
      expected: 'Участок → [Виртуальная зона] → [Виртуальная группа] → [Виртуальное помещение] → Техкарта'
    },
    {
      name: '10. Только техкарта',
      data: {
        siteName: null,
        zoneName: null,
        roomGroupName: null,
        roomName: null,
        cleaningObject: null,
        techTask: 'Техкарта 10'
      },
      expected: 'Техкарта привязана напрямую к объекту'
    }
  ];
  
  // Создаем тестовый объект (используем существующего пользователя)
  const firstUser = await prisma.user.findFirst();
  
  if (!firstUser) {
    console.log('❌ Не найден пользователь для создания объекта');
    await prisma.$disconnect();
    return;
  }
  
  const testObject = await prisma.cleaningObject.create({
    data: {
      name: 'ТЕСТОВЫЙ ОБЪЕКТ - Все сценарии',
      address: 'Тестовый адрес',
      creatorId: firstUser.id
    }
  });
  
  console.log(`✅ Создан тестовый объект: ${testObject.name}\n`);
  console.log('='.repeat(70));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`   Ожидается: ${scenario.expected}`);
    
    try {
      const { siteName, zoneName, roomGroupName, roomName, cleaningObject, techTask } = scenario.data;
      
      // Определяем первый непустой уровень
      const firstLevel = siteName ? 'site' : (zoneName ? 'zone' : (roomGroupName ? 'group' : (roomName ? 'room' : (cleaningObject ? 'item' : 'techcard'))));
      
      let siteId: string | null = null;
      let zoneId: string | null = null;
      let roomGroupId: string | null = null;
      let roomId: string | null = null;
      let cleaningItemId: string | null = null;
      
      // 1. УЧАСТОК
      if (siteName) {
        const site = await prisma.site.create({
          data: { name: siteName, objectId: testObject.id }
        });
        siteId = site.id;
      } else if (zoneName || roomGroupName || roomName || cleaningObject) {
        const site = await prisma.site.create({
          data: { name: '__VIRTUAL__', objectId: testObject.id, comment: 'Виртуальный участок' }
        });
        siteId = site.id;
      }
      
      // 2. ЗОНА
      if (siteId) {
        if (zoneName) {
          const zone = await prisma.zone.create({
            data: { name: zoneName, siteId: siteId }
          });
          zoneId = zone.id;
        } else if (roomGroupName || roomName || cleaningObject) {
          const zone = await prisma.zone.create({
            data: { name: '__VIRTUAL__', siteId: siteId }
          });
          zoneId = zone.id;
        }
      }
      
      // 3. ГРУППА
      if (zoneId) {
        if (roomGroupName) {
          const group = await prisma.roomGroup.create({
            data: { name: roomGroupName, zoneId: zoneId }
          });
          roomGroupId = group.id;
        } else {
          // ВСЕГДА создаем виртуальную группу если есть зона
          const group = await prisma.roomGroup.create({
            data: { name: '__VIRTUAL__', zoneId: zoneId, description: 'Виртуальная группа' }
          });
          roomGroupId = group.id;
        }
      }
      
      // 4. ПОМЕЩЕНИЕ
      if (roomName) {
        const room = await prisma.room.create({
          data: { name: roomName, objectId: testObject.id, roomGroupId: roomGroupId }
        });
        roomId = room.id;
      } else if (roomGroupId) {
        const room = await prisma.room.create({
          data: { name: '__VIRTUAL__', objectId: testObject.id, roomGroupId: roomGroupId, description: 'Виртуальное помещение' }
        });
        roomId = room.id;
      }
      
      // 5. ОБЪЕКТ УБОРКИ
      if (cleaningObject && roomId) {
        const item = await prisma.cleaningObjectItem.create({
          data: { name: cleaningObject, roomId: roomId }
        });
        cleaningItemId = item.id;
      }
      
      // 6. ТЕХКАРТА
      await prisma.techCard.create({
        data: {
          name: techTask,
          workType: 'Уборка',
          frequency: 'Тест',
          objectId: testObject.id,
          roomId: roomId,
          cleaningObjectItemId: cleaningItemId
        }
      });
      
      console.log(`   ✅ УСПЕХ`);
      passedTests++;
      
    } catch (error: any) {
      console.log(`   ❌ ОШИБКА: ${error.message}`);
      failedTests++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`\n📊 РЕЗУЛЬТАТЫ:`);
  console.log(`   ✅ Успешно: ${passedTests}/${testScenarios.length}`);
  console.log(`   ❌ Ошибок: ${failedTests}/${testScenarios.length}`);
  
  if (failedTests === 0) {
    console.log(`\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!`);
  } else {
    console.log(`\n⚠️  ЕСТЬ ОШИБКИ - требуется доработка`);
  }
  
  // Удаляем тестовый объект
  console.log(`\n🗑️  Удаление тестового объекта...`);
  await prisma.techCard.deleteMany({ where: { objectId: testObject.id } });
  await prisma.cleaningObjectItem.deleteMany({ where: { room: { objectId: testObject.id } } });
  await prisma.room.deleteMany({ where: { objectId: testObject.id } });
  await prisma.roomGroup.deleteMany({ where: { zone: { site: { objectId: testObject.id } } } });
  await prisma.zone.deleteMany({ where: { site: { objectId: testObject.id } } });
  await prisma.site.deleteMany({ where: { objectId: testObject.id } });
  await prisma.cleaningObject.delete({ where: { id: testObject.id } });
  console.log(`✅ Тестовый объект удален\n`);
  
  await prisma.$disconnect();
}

testAllScenarios().catch(console.error);
