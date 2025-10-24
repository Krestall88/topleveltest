const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentAssignments() {
  console.log('🔍 Проверяем текущие назначения менеджеров...\n');

  try {
    // Получаем объекты с менеджерами
    const objects = await prisma.cleaningObject.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Всего объектов: ${objects.length}\n`);

    let assignedCount = 0;
    let unassignedCount = 0;

    objects.forEach((obj, index) => {
      if (obj.manager) {
        assignedCount++;
        console.log(`${index + 1}. ✅ "${obj.name}"`);
        console.log(`   👤 Менеджер: ${obj.manager.name} (${obj.manager.phone || 'нет телефона'})`);
      } else {
        unassignedCount++;
        console.log(`${index + 1}. ❌ "${obj.name}"`);
        console.log(`   👤 Менеджер: НЕ НАЗНАЧЕН`);
      }
      console.log('');
    });

    console.log('📈 СТАТИСТИКА:');
    console.log(`✅ С назначенными менеджерами: ${assignedCount}`);
    console.log(`❌ Без менеджеров: ${unassignedCount}`);
    console.log(`📊 Процент покрытия: ${Math.round((assignedCount / objects.length) * 100)}%`);

    // Проверим также участки (Sites)
    console.log('\n🏢 УЧАСТКИ С КОММЕНТАРИЯМИ:');
    const sites = await prisma.site.findMany({
      where: {
        comment: {
          not: null
        }
      },
      include: {
        manager: {
          select: {
            name: true
          }
        },
        object: {
          select: {
            name: true
          }
        }
      }
    });

    sites.forEach((site, index) => {
      console.log(`${index + 1}. "${site.object.name}" - участок: "${site.comment}"`);
      console.log(`   👤 Менеджер: ${site.manager?.name || 'НЕ НАЗНАЧЕН'}`);
    });

    console.log(`\n📊 Участков с комментариями: ${sites.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentAssignments();
