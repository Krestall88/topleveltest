const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log(' Проверяем пользователей в системе...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        managedObjects: {
          select: {
            id: true,
            name: true,
            techCards: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });
    
    console.log(` Всего пользователей: ${users.length}`);
    
    const roleStats = {};
    users.forEach(user => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1;
    });
    
    console.log('\n Статистика по ролям:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`${role}: ${count}`);
    });
    
    console.log('\n Пользователи для входа:');
    users.forEach((user, i) => {
      console.log(`${i+1}. ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone || 'Не указан'}`);
      console.log(`   Объектов: ${user.managedObjects?.length || 0}`);
      
      if (user.managedObjects?.length > 0) {
        user.managedObjects.forEach((obj, j) => {
          console.log(`   ${j+1}. ${obj.name} (техкарт: ${obj.techCards?.length || 0})`);
        });
      }
      console.log('');
    });
    
    // Проверим админов
    const admins = users.filter(u => ['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(u.role));
    console.log('\n Администраторы для тестирования:');
    admins.forEach(admin => {
      console.log(`- ${admin.email} (${admin.role})`);
    });
    
    // Проверим менеджеров с объектами
    const managersWithObjects = users.filter(u => u.role === 'MANAGER' && u.managedObjects?.length > 0);
    console.log('\n Менеджеры с объектами для тестирования:');
    managersWithObjects.forEach(manager => {
      console.log(`- ${manager.email} (объектов: ${manager.managedObjects.length})`);
    });
    
  } catch (error) {
    console.error(' Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
