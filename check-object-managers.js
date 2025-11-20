const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkManagers() {
  try {
    // Ищем объект "Южный город, дома 26 квартала"
    const objects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: '26 квартала',
          mode: 'insensitive'
        }
      },
      include: {
        manager: true,
        sites: {
          include: {
            manager: true,
            seniorManager: true
          }
        }
      }
    });

    console.log(`\n📊 Найдено объектов: ${objects.length}\n`);

    for (const obj of objects) {
      console.log(`🏢 Объект: ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Менеджер объекта: ${obj.manager ? obj.manager.name : 'НЕТ'}`);
      console.log(`   Количество участков: ${obj.sites?.length || 0}\n`);

      if (obj.sites && obj.sites.length > 0) {
        console.log('   📍 Участки:');
        obj.sites.forEach((site, idx) => {
          console.log(`   ${idx + 1}. ${site.name}`);
          console.log(`      ID: ${site.id}`);
          console.log(`      Comment: ${site.comment || 'нет'}`);
          console.log(`      Менеджер: ${site.manager ? site.manager.name : 'НЕТ'}`);
          console.log(`      Старший менеджер: ${site.seniorManager ? site.seniorManager.name : 'НЕТ'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManagers();
