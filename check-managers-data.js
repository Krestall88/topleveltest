const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkManagersData() {
  console.log('🔍 Проверяем данные менеджеров и их привязки...\n');

  try {
    // 1. Проверяем менеджеров с их объектами и участками
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      include: {
        managedObjects: {
          select: {
            id: true,
            name: true,
            address: true,
            sites: {
              select: {
                id: true,
                name: true,
                areaInfo: true,
                managerId: true
              }
            }
          }
        },
        managedSites: {
          select: {
            id: true,
            name: true,
            areaInfo: true,
            object: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        }
      }
    });

    console.log(`👥 Найдено менеджеров: ${managers.length}\n`);

    // 2. Анализируем каждого менеджера
    for (const manager of managers) {
      console.log(`📋 МЕНЕДЖЕР: ${manager.name} (${manager.phone || 'без телефона'})`);
      console.log(`   📧 Email: ${manager.email}`);
      
      // Объекты под управлением
      if (manager.managedObjects.length > 0) {
        console.log(`   🏢 Объекты под управлением (${manager.managedObjects.length}):`);
        for (const obj of manager.managedObjects) {
          console.log(`      - ${obj.name}`);
          console.log(`        📍 ${obj.address}`);
          
          // Участки в этом объекте
          const managerSitesInObject = obj.sites.filter(site => site.managerId === manager.id);
          if (managerSitesInObject.length > 0) {
            console.log(`        🏗️ Участки менеджера в этом объекте (${managerSitesInObject.length}):`);
            for (const site of managerSitesInObject) {
              console.log(`           * ${site.name}`);
              if (site.areaInfo) {
                console.log(`             📍 ${site.areaInfo}`);
              }
            }
          }
        }
      } else {
        console.log(`   🏢 Объекты под управлением: нет`);
      }

      // Участки в других объектах
      if (manager.managedSites.length > 0) {
        console.log(`   🏗️ Участки в других объектах (${manager.managedSites.length}):`);
        for (const site of manager.managedSites) {
          console.log(`      - ${site.name} в объекте "${site.object.name}"`);
          if (site.areaInfo) {
            console.log(`        📍 ${site.areaInfo}`);
          }
        }
      } else {
        console.log(`   🏗️ Участки в других объектах: нет`);
      }

      console.log(''); // Пустая строка для разделения
    }

    // 3. Проверяем объекты с множественными менеджерами
    console.log('\n🔍 ОБЪЕКТЫ С МНОЖЕСТВЕННЫМИ МЕНЕДЖЕРАМИ:\n');
    
    const objectsWithMultipleManagers = await prisma.cleaningObject.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        sites: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            }
          }
        }
      }
    });

    for (const obj of objectsWithMultipleManagers) {
      // Собираем всех уникальных менеджеров (основной + менеджеры участков)
      const allManagers = new Map();
      
      // Основной менеджер
      if (obj.manager) {
        allManagers.set(obj.manager.id, {
          ...obj.manager,
          role: 'Основной менеджер',
          sites: []
        });
      }

      // Менеджеры участков
      for (const site of obj.sites) {
        if (site.manager) {
          if (allManagers.has(site.manager.id)) {
            allManagers.get(site.manager.id).sites.push(site);
          } else {
            allManagers.set(site.manager.id, {
              ...site.manager,
              role: 'Менеджер участка',
              sites: [site]
            });
          }
        }
      }

      if (allManagers.size > 1) {
        console.log(`🏢 ОБЪЕКТ: ${obj.name}`);
        console.log(`   📍 Адрес: ${obj.address}`);
        console.log(`   👥 Менеджеров: ${allManagers.size}`);
        
        for (const [managerId, managerData] of allManagers) {
          console.log(`      - ${managerData.name} (${managerData.phone || 'без телефона'})`);
          console.log(`        Роль: ${managerData.role}`);
          
          if (managerData.sites.length > 0) {
            console.log(`        Участки:`);
            for (const site of managerData.sites) {
              console.log(`           * ${site.name}`);
              if (site.areaInfo) {
                console.log(`             📍 ${site.areaInfo}`);
              }
            }
          }
        }
        console.log('');
      }
    }

    // 4. Статистика по участкам
    console.log('\n📊 СТАТИСТИКА ПО УЧАСТКАМ:\n');
    
    const sitesStats = await prisma.site.groupBy({
      by: ['managerId'],
      _count: {
        id: true
      },
      where: {
        managerId: {
          not: null
        }
      }
    });

    for (const stat of sitesStats) {
      const manager = await prisma.user.findUnique({
        where: { id: stat.managerId },
        select: { name: true, phone: true }
      });
      
      if (manager) {
        console.log(`👤 ${manager.name} (${manager.phone || 'без телефона'}): ${stat._count.id} участков`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем проверку
checkManagersData();
