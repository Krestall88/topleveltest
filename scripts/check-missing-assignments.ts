import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Проверка менеджеров без назначений...\n');

  const managersToCheck = [
    'Брагина Катерина Юрьевна',
    'Тимохина Анна Анатольевна',
    'Гордеев Роман Владимирович',
    'Ласкин Павел Александрович'
  ];

  for (const managerName of managersToCheck) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Менеджер: ${managerName}`);
    console.log('='.repeat(80));

    const manager = await prisma.user.findFirst({
      where: {
        name: managerName,
        role: 'MANAGER'
      },
      include: {
        managedObjects: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        managedSites: {
          select: {
            id: true,
            name: true,
            object: {
              select: {
                name: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (!manager) {
      console.log(`❌ Менеджер не найден в базе данных`);
      continue;
    }

    console.log(`✅ Найден в базе: ${manager.email}`);
    console.log(`   ID: ${manager.id}`);
    console.log(`   Телефон: ${manager.phone || 'не указан'}`);
    
    console.log(`\n📦 Прямо назначенные объекты: ${manager.managedObjects.length}`);
    if (manager.managedObjects.length > 0) {
      manager.managedObjects.forEach((obj, i) => {
        console.log(`   ${i + 1}. ${obj.name}`);
        console.log(`      ${obj.address}`);
      });
    } else {
      console.log(`   ⚠️  Нет прямых назначений`);
    }

    console.log(`\n📍 Назначенные участки: ${manager.managedSites.length}`);
    if (manager.managedSites.length > 0) {
      manager.managedSites.forEach((site, i) => {
        if (!site.name.includes('__VIRTUAL__')) {
          console.log(`   ${i + 1}. ${site.name} (${site.object.name})`);
        }
      });
    } else {
      console.log(`   ⚠️  Нет назначенных участков`);
    }

    // Ищем объекты, которые должны быть у этого менеджера по данным из parsed-managers-data.json
    console.log(`\n🔎 Поиск объектов, которые должны быть назначены...`);
    
    const expectedObjects = await prisma.cleaningObject.findMany({
      where: {
        OR: [
          { name: { contains: 'СБКК' } },
          { address: { contains: 'Московское шоссе, 234' } }
        ]
      },
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: {
            name: true
          }
        }
      }
    });

    if (expectedObjects.length > 0) {
      console.log(`   Найдено потенциальных объектов: ${expectedObjects.length}`);
      expectedObjects.forEach((obj, i) => {
        console.log(`   ${i + 1}. ${obj.name}`);
        console.log(`      ${obj.address}`);
        console.log(`      Текущий менеджер: ${obj.manager?.name || 'не назначен'}`);
      });
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Проверка завершена');
  console.log('='.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
