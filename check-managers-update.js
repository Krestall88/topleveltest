const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkManagersUpdate() {
  console.log('🔍 Проверяем результаты обновления менеджеров...\n');

  try {
    // 1. Проверяем общую статистику
    const totalManagers = await prisma.user.count({
      where: { role: 'MANAGER' }
    });

    const totalObjects = await prisma.cleaningObject.count();
    
    const totalSites = await prisma.site.count();

    console.log('📊 ОБЩАЯ СТАТИСТИКА:');
    console.log(`   👥 Менеджеров в системе: ${totalManagers}`);
    console.log(`   🏢 Объектов в системе: ${totalObjects}`);
    console.log(`   🏗️ Участков в системе: ${totalSites}\n`);

    // 2. Проверяем новых менеджеров
    const newManagers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true
      }
    });

    console.log('👤 НОВЫЕ МЕНЕДЖЕРЫ (за последние 24 часа):');
    if (newManagers.length > 0) {
      newManagers.forEach((manager, index) => {
        console.log(`   ${index + 1}. ${manager.name} (${manager.phone})`);
      });
    } else {
      console.log('   Новых менеджеров не найдено');
    }
    console.log('');

    // 3. Проверяем участки с информацией
    const sitesWithAreaInfo = await prisma.site.findMany({
      where: {
        areaInfo: {
          not: null
        }
      },
      include: {
        manager: {
          select: {
            name: true,
            phone: true
          }
        },
        object: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('🏗️ УЧАСТКИ С ДЕТАЛЬНОЙ ИНФОРМАЦИЕЙ:');
    if (sitesWithAreaInfo.length > 0) {
      sitesWithAreaInfo.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.name}`);
        console.log(`      📍 Объект: ${site.object.name}`);
        console.log(`      👤 Менеджер: ${site.manager?.name || 'Не назначен'}`);
        console.log(`      📋 Участок: ${site.areaInfo}`);
        console.log(`      📝 Описание: ${site.description || 'Не указано'}`);
        console.log('');
      });
    } else {
      console.log('   Участков с информацией не найдено');
    }

    // 4. Проверяем объекты без менеджеров
    const objectsWithoutManagers = await prisma.cleaningObject.findMany({
      where: {
        managerId: null
      },
      select: {
        id: true,
        name: true,
        address: true
      }
    });

    console.log('⚠️ ОБЪЕКТЫ БЕЗ МЕНЕДЖЕРОВ:');
    if (objectsWithoutManagers.length > 0) {
      objectsWithoutManagers.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name}`);
        console.log(`      📍 Адрес: ${obj.address}`);
      });
    } else {
      console.log('   ✅ Все объекты имеют назначенных менеджеров');
    }
    console.log('');

    // 5. Топ менеджеров по количеству участков
    const managersWithSites = await prisma.user.findMany({
      where: {
        role: 'MANAGER'
      },
      include: {
        managedSites: {
          include: {
            object: {
              select: {
                name: true
              }
            }
          }
        },
        managedObjects: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('🏆 ТОП МЕНЕДЖЕРОВ ПО УЧАСТКАМ:');
    const managerStats = managersWithSites
      .map(manager => ({
        name: manager.name,
        phone: manager.phone,
        sitesCount: manager.managedSites.length,
        objectsCount: manager.managedObjects.length,
        sites: manager.managedSites.map(site => ({
          name: site.name,
          object: site.object.name,
          areaInfo: site.areaInfo
        }))
      }))
      .sort((a, b) => b.sitesCount - a.sitesCount)
      .slice(0, 10);

    managerStats.forEach((manager, index) => {
      console.log(`   ${index + 1}. ${manager.name} (${manager.phone})`);
      console.log(`      🏗️ Участков: ${manager.sitesCount}`);
      console.log(`      🏢 Объектов: ${manager.objectsCount}`);
      if (manager.sites.length > 0) {
        console.log(`      📋 Участки:`);
        manager.sites.forEach(site => {
          console.log(`         - ${site.name} (${site.object})`);
          if (site.areaInfo) {
            console.log(`           📍 ${site.areaInfo}`);
          }
        });
      }
      console.log('');
    });

    // 6. Проверяем дубли менеджеров по телефону
    const phoneGroups = await prisma.user.groupBy({
      by: ['phone'],
      where: {
        role: 'MANAGER',
        phone: {
          not: null
        }
      },
      _count: {
        phone: true
      },
      having: {
        phone: {
          _count: {
            gt: 1
          }
        }
      }
    });

    console.log('🔍 ПРОВЕРКА НА ДУБЛИ:');
    if (phoneGroups.length > 0) {
      console.log('   ⚠️ Найдены дубли по телефону:');
      for (const group of phoneGroups) {
        const duplicates = await prisma.user.findMany({
          where: {
            phone: group.phone,
            role: 'MANAGER'
          },
          select: {
            name: true,
            phone: true,
            createdAt: true
          }
        });
        console.log(`   📞 ${group.phone}:`);
        duplicates.forEach(user => {
          console.log(`      - ${user.name} (создан: ${user.createdAt.toLocaleDateString()})`);
        });
      }
    } else {
      console.log('   ✅ Дублей не найдено');
    }

    console.log('\n🎉 Проверка завершена!');

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем проверку
checkManagersUpdate();
