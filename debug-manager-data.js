const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugManagerData() {
  console.log('🔍 Отладка данных менеджера...\n');

  try {
    // Найдем всех менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            managedObjects: true,
            managedSites: true
          }
        }
      },
      take: 5
    });

    console.log('👥 Найдено менеджеров:', managers.length);
    
    for (const manager of managers) {
      console.log(`\n📋 ${manager.name}`);
      console.log(`   ID: ${manager.id}`);
      console.log(`   Email: ${manager.email}`);
      console.log(`   Объектов: ${manager._count.managedObjects}`);
      console.log(`   Участков: ${manager._count.managedSites}`);

      if (manager._count.managedObjects > 0 || manager._count.managedSites > 0) {
        console.log('   ✅ У этого менеджера есть назначения!');
        
        // Получим детальную информацию для этого менеджера
        const details = await prisma.user.findUnique({
          where: { id: manager.id },
          select: {
            managedObjects: {
              select: {
                id: true,
                name: true,
                address: true,
                sites: {
                  where: { managerId: manager.id },
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            },
            managedSites: {
              select: {
                id: true,
                name: true,
                description: true,
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

        console.log('\n   🏢 Объекты под управлением:');
        details.managedObjects.forEach(obj => {
          console.log(`      - ${obj.name} (${obj.address})`);
          console.log(`        Участков менеджера: ${obj.sites.length}`);
          obj.sites.forEach(site => {
            console.log(`          * ${site.name}`);
          });
        });

        console.log('\n   🏗️ Участки в других объектах:');
        details.managedSites.forEach(site => {
          console.log(`      - ${site.name} (${site.object.name})`);
        });

        // Тестируем API endpoint
        console.log(`\n   🔗 Тест API: /api/managers/${manager.id}/details`);
        break; // Тестируем только первого менеджера с данными
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugManagerData();
