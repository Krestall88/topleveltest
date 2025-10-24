const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeEmptyManagers() {
  console.log('🔍 Анализируем менеджеров без назначений...\n');

  try {
    // Найдем всех менеджеров с @cleaning.com без назначений
    const emptyManagers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        email: {
          endsWith: '@cleaning.com'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        managedObjects: {
          select: { id: true, name: true }
        },
        managedSites: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`📊 Всего менеджеров с @cleaning.com: ${emptyManagers.length}\n`);

    const managersWithoutAssignments = emptyManagers.filter(manager => 
      manager.managedObjects.length === 0 && manager.managedSites.length === 0
    );

    console.log(`❌ Менеджеров без назначений: ${managersWithoutAssignments.length}\n`);

    for (const manager of managersWithoutAssignments) {
      console.log(`🔍 Проверяем: ${manager.name} (${manager.email})`);
      
      // Ищем возможные дубли с @temp.com
      const possibleDuplicates = await prisma.user.findMany({
        where: {
          role: 'MANAGER',
          email: {
            endsWith: '@temp.com'
          },
          OR: [
            { name: manager.name },
            { name: { contains: manager.name.split(' ')[0], mode: 'insensitive' } },
            { phone: manager.phone }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          managedObjects: {
            select: { id: true, name: true }
          },
          managedSites: {
            select: { id: true, name: true }
          }
        }
      });

      if (possibleDuplicates.length > 0) {
        console.log(`   🎯 Найдено возможных дублей: ${possibleDuplicates.length}`);
        
        possibleDuplicates.forEach(duplicate => {
          const hasAssignments = duplicate.managedObjects.length > 0 || duplicate.managedSites.length > 0;
          console.log(`   📋 "${duplicate.name}" (${duplicate.email})`);
          console.log(`      Объекты: ${duplicate.managedObjects.length}, Участки: ${duplicate.managedSites.length}`);
          if (hasAssignments) {
            console.log(`      ⚠️ ЭТОТ ДУБЛЬ ИМЕЕТ НАЗНАЧЕНИЯ!`);
          }
        });
      } else {
        console.log(`   ✅ Дублей не найдено - менеджер действительно без назначений`);
      }
      console.log('');
    }

    // Покажем также менеджеров с назначениями для сравнения
    const managersWithAssignments = emptyManagers.filter(manager => 
      manager.managedObjects.length > 0 || manager.managedSites.length > 0
    );

    console.log(`✅ Менеджеров с назначениями: ${managersWithAssignments.length}`);
    managersWithAssignments.forEach(manager => {
      console.log(`   👤 ${manager.name}: ${manager.managedObjects.length} объектов, ${manager.managedSites.length} участков`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeEmptyManagers();
