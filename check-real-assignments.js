const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRealAssignments() {
  console.log('🔍 Проверяем реальные назначения в базе данных...\n');

  try {
    // Проверим несколько конкретных менеджеров из списка
    const targetManagers = [
      'Штельмашенко Ирина Николаевна',
      'Нувальцева Мария Александровна', 
      'Халидова Лилия Ильшатовна',
      'Брагина Катерина Юрьевна'
    ];

    for (const managerName of targetManagers) {
      console.log(`\n👤 Проверяем: ${managerName}`);
      
      const manager = await prisma.user.findFirst({
        where: { 
          name: managerName,
          role: 'MANAGER'
        }
      });

      if (!manager) {
        console.log('   ❌ Менеджер не найден в базе');
        continue;
      }

      console.log(`   ✅ Найден в базе, ID: ${manager.id}`);

      // Проверим объекты, где этот менеджер назначен
      const objectsAsManager = await prisma.cleaningObject.findMany({
        where: { managerId: manager.id },
        select: {
          id: true,
          name: true,
          address: true
        }
      });

      console.log(`   🏢 Объектов под управлением: ${objectsAsManager.length}`);
      objectsAsManager.forEach(obj => {
        console.log(`      - ${obj.name} (${obj.address})`);
      });

      // Проверим участки, где этот менеджер назначен
      const sitesAsManager = await prisma.site.findMany({
        where: { managerId: manager.id },
        select: {
          id: true,
          name: true,
          areaInfo: true,
          object: {
            select: {
              name: true,
              address: true
            }
          }
        }
      });

      console.log(`   🏗️ Участков под управлением: ${sitesAsManager.length}`);
      sitesAsManager.forEach(site => {
        console.log(`      - ${site.name} (${site.areaInfo || 'без описания'}) в объекте "${site.object.name}"`);
      });

      // Проверим все объекты, которые содержат имя менеджера в названии или описании
      const objectsWithManagerName = await prisma.cleaningObject.findMany({
        where: {
          OR: [
            { name: { contains: managerName, mode: 'insensitive' } },
            { description: { contains: managerName, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          address: true,
          managerId: true,
          manager: {
            select: {
              name: true
            }
          }
        }
      });

      if (objectsWithManagerName.length > 0) {
        console.log(`   🔍 Объекты, содержащие имя менеджера: ${objectsWithManagerName.length}`);
        objectsWithManagerName.forEach(obj => {
          console.log(`      - ${obj.name}`);
          console.log(`        Текущий менеджер: ${obj.manager?.name || 'не назначен'}`);
        });
      }

      // Проверим участки, которые содержат информацию, связанную с менеджером
      const sitesWithInfo = await prisma.site.findMany({
        where: {
          object: {
            OR: [
              { name: { contains: 'Юг-сервис', mode: 'insensitive' } },
              { name: { contains: 'Инкатех', mode: 'insensitive' } },
              { name: { contains: 'СБКК', mode: 'insensitive' } }
            ]
          }
        },
        select: {
          id: true,
          name: true,
          areaInfo: true,
          managerId: true,
          manager: {
            select: {
              name: true
            }
          },
          object: {
            select: {
              name: true,
              address: true
            }
          }
        }
      });

      if (sitesWithInfo.length > 0) {
        console.log(`   🏗️ Найденные участки в ключевых объектах: ${sitesWithInfo.length}`);
        sitesWithInfo.forEach(site => {
          console.log(`      - ${site.name} (${site.areaInfo || 'без описания'})`);
          console.log(`        Объект: ${site.object.name}`);
          console.log(`        Менеджер участка: ${site.manager?.name || 'не назначен'}`);
        });
      }
    }

    // Общая статистика
    console.log('\n📊 ОБЩАЯ СТАТИСТИКА:');
    
    const totalObjects = await prisma.cleaningObject.count();
    const objectsWithManagers = await prisma.cleaningObject.count({
      where: { managerId: { not: null } }
    });
    
    const totalSites = await prisma.site.count();
    const sitesWithManagers = await prisma.site.count({
      where: { managerId: { not: null } }
    });

    console.log(`Всего объектов: ${totalObjects}`);
    console.log(`Объектов с менеджерами: ${objectsWithManagers}`);
    console.log(`Всего участков: ${totalSites}`);
    console.log(`Участков с менеджерами: ${sitesWithManagers}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealAssignments();
