const { PrismaClient } = require('@prisma/client');

async function checkDatabaseState() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 ПРОВЕРКА СОСТОЯНИЯ БАЗЫ ДАННЫХ\n');
    
    // 1. Проверяем всех пользователей
    console.log('👥 Все пользователи в базе:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Всего пользователей: ${allUsers.length}\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Роль: ${user.role}`);
      console.log(`   Создан: ${user.createdAt}`);
      console.log('');
    });
    
    // 2. Отдельно проверяем администраторов
    console.log('👑 Администраторы:');
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'DEPUTY_ADMIN' }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.role})`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log('');
    });
    
    // 3. Проверяем менеджеров с кириллическими логинами
    console.log('👨‍💼 Менеджеры с проблемными логинами:');
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    
    const problematicManagers = managers.filter(manager => {
      const emailPart = manager.email.split('@')[0];
      // Проверяем наличие кириллических символов
      return /[а-яё]/i.test(emailPart);
    });
    
    console.log(`Менеджеров с кириллицей в email: ${problematicManagers.length}`);
    problematicManagers.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   Проблемный email: ${manager.email}`);
      console.log(`   ID: ${manager.id}`);
      console.log('');
    });
    
    // 4. Проверяем назначения заместителей
    console.log('🏢 Назначения заместителей администратора:');
    const assignments = await prisma.deputyAdminAssignment.findMany({
      include: {
        deputyAdmin: {
          select: {
            name: true,
            email: true
          }
        },
        object: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Всего назначений: ${assignments.length}`);
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.deputyAdmin.name} → ${assignment.object.name}`);
    });
    
    // 5. Ищем недавно созданных пользователей (за последний час)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log(`\n🕐 Пользователи, созданные за последний час: ${recentUsers.length}`);
    recentUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Создан: ${user.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Ошибка проверки базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();
