const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeCurrentData() {
  try {
    console.log('📊 Анализ текущих данных в системе...\n');

    // Получаем всех менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { name: 'asc' }
    });

    console.log('👥 ТЕКУЩИЕ МЕНЕДЖЕРЫ В СИСТЕМЕ:');
    console.log('='.repeat(50));
    managers.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   📧 ${manager.email}`);
      console.log(`   📱 ${manager.phone || 'Телефон не указан'}`);
      console.log('');
    });

    // Получаем все объекты с менеджерами
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log('\n🏢 ТЕКУЩИЕ ОБЪЕКТЫ В СИСТЕМЕ:');
    console.log('='.repeat(50));
    objects.forEach((object, index) => {
      console.log(`${index + 1}. ${object.name}`);
      console.log(`   📍 ${object.address}`);
      console.log(`   👤 Менеджер: ${object.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      if (object.manager?.phone) {
        console.log(`   📱 ${object.manager.phone}`);
      }
      console.log('');
    });

    console.log(`\n📈 СТАТИСТИКА:`);
    console.log(`   Менеджеров: ${managers.length}`);
    console.log(`   Объектов: ${objects.length}`);
    console.log(`   Объектов без менеджера: ${objects.filter(o => !o.manager).length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCurrentData();
