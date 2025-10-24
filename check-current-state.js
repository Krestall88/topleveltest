const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentState() {
  console.log('🔍 Проверяем текущее состояние базы данных...\n');

  try {
    // Проверяем менеджеров и их назначения
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            managedObjects: true,
            managedSites: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('👥 МЕНЕДЖЕРЫ И ИХ НАЗНАЧЕНИЯ:');
    console.log('='.repeat(50));
    
    let totalManagers = 0;
    let managersWithAssignments = 0;
    
    for (const manager of managers) {
      totalManagers++;
      const hasAssignments = manager._count.managedObjects > 0 || manager._count.managedSites > 0;
      
      if (hasAssignments) {
        managersWithAssignments++;
        console.log(`✅ ${manager.name}`);
        console.log(`   📊 Объекты: ${manager._count.managedObjects}, Участки: ${manager._count.managedSites}`);
      } else {
        console.log(`⚪ ${manager.name} - без назначений`);
      }
    }

    console.log('\n📈 ОБЩАЯ СТАТИСТИКА:');
    console.log('='.repeat(30));
    console.log(`👥 Всего менеджеров: ${totalManagers}`);
    console.log(`✅ С назначениями: ${managersWithAssignments}`);
    console.log(`⚪ Без назначений: ${totalManagers - managersWithAssignments}`);

    // Проверяем объекты с несколькими менеджерами
    console.log('\n🏢 ОБЪЕКТЫ С НЕСКОЛЬКИМИ МЕНЕДЖЕРАМИ:');
    console.log('='.repeat(40));
    
    const objectsWithMultipleManagers = await prisma.cleaningObject.findMany({
      where: {
        sites: {
          some: {
            managerId: {
              not: null
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        manager: {
          select: {
            name: true
          }
        },
        sites: {
          where: {
            managerId: {
              not: null
            }
          },
          select: {
            name: true,
            comment: true,
            manager: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    for (const object of objectsWithMultipleManagers) {
      if (object.sites.length > 0) {
        console.log(`🏢 ${object.name}`);
        if (object.manager) {
          console.log(`   👤 Основной менеджер: ${object.manager.name}`);
        }
        console.log(`   📍 Участки:`);
        for (const site of object.sites) {
          console.log(`      • ${site.name} (${site.manager?.name || 'Без менеджера'})`);
          if (site.comment) {
            console.log(`        💬 Комментарий: ${site.comment}`);
          }
        }
        console.log('');
      }
    }

    // Проверяем участки с комментариями
    const sitesWithComments = await prisma.site.count({
      where: {
        comment: {
          not: null,
          not: ''
        }
      }
    });

    console.log(`💬 Участков с комментариями: ${sitesWithComments}`);

  } catch (error) {
    console.error('❌ Ошибка при проверке состояния:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentState();
