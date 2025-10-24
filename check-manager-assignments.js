const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkManagerAssignments() {
  console.log('🔍 Проверяем назначения менеджеров...\n');

  try {
    // Найдем менеджеров с назначениями
    const managersWithCounts = await prisma.user.findMany({
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
      }
    });

    console.log('👥 Менеджеры и их назначения:');
    managersWithCounts.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   ID: ${manager.id}`);
      console.log(`   Объектов: ${manager._count.managedObjects}`);
      console.log(`   Участков: ${manager._count.managedSites}`);
      
      if (manager._count.managedObjects > 0 || manager._count.managedSites > 0) {
        console.log('   ✅ Есть назначения!');
      } else {
        console.log('   ❌ Нет назначений');
      }
      console.log('');
    });

    // Найдем менеджера с максимальным количеством назначений
    const managerWithMostAssignments = managersWithCounts.reduce((max, current) => {
      const currentTotal = current._count.managedObjects + current._count.managedSites;
      const maxTotal = max._count.managedObjects + max._count.managedSites;
      return currentTotal > maxTotal ? current : max;
    });

    console.log(`🏆 Менеджер с наибольшим количеством назначений: ${managerWithMostAssignments.name}`);
    console.log(`   Объектов: ${managerWithMostAssignments._count.managedObjects}`);
    console.log(`   Участков: ${managerWithMostAssignments._count.managedSites}`);

    // Получим детальную информацию для этого менеджера
    if (managerWithMostAssignments._count.managedObjects > 0 || managerWithMostAssignments._count.managedSites > 0) {
      console.log(`\n🔍 Детальная информация для ${managerWithMostAssignments.name}:`);
      
      const details = await prisma.user.findUnique({
        where: { id: managerWithMostAssignments.id },
        select: {
          managedObjects: {
            select: {
              id: true,
              name: true,
              address: true,
              sites: {
                where: { managerId: managerWithMostAssignments.id },
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

      console.log('\n📋 Объекты под управлением:');
      details.managedObjects.forEach(obj => {
        console.log(`   - ${obj.name}`);
        console.log(`     📍 ${obj.address}`);
        console.log(`     🏗️ Участков менеджера: ${obj.sites.length}`);
        obj.sites.forEach(site => {
          console.log(`       * ${site.name}`);
        });
      });

      console.log('\n🏗️ Участки в других объектах:');
      details.managedSites.forEach(site => {
        console.log(`   - ${site.name} (${site.object.name})`);
      });

      console.log(`\n🔗 Тестовый URL: /api/managers/${managerWithMostAssignments.id}/details`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManagerAssignments();
