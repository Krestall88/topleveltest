const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRealData() {
  try {
    console.log('🔍 Проверка сохранившихся данных...\n');

    // Проверяем пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { role: 'asc' }
    });
    
    console.log(`👥 ПОЛЬЗОВАТЕЛИ (${users.length}):`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Проверяем объекты
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n🏢 ОБЪЕКТЫ (${objects.length}):`);
    objects.forEach(obj => {
      const managerInfo = obj.manager ? ` → ${obj.manager.name}` : ' → НЕТ МЕНЕДЖЕРА';
      console.log(`   - ${obj.name} (${obj.address})${managerInfo}`);
    });

    // Проверяем помещения
    const rooms = await prisma.room.findMany({
      include: {
        object: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`\n🏠 ПОМЕЩЕНИЯ (${rooms.length}):`);
    rooms.forEach(room => {
      console.log(`   - ${room.name} (${room.area} м²) в ${room.object.name}`);
    });

    console.log('\n✅ Основные данные сохранились!');
    console.log('❌ Потеряны: техкарты, чек-листы, задачи');
    console.log('\n🔧 Нужно восстановить только систему инвентаря без потери данных');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealData();
