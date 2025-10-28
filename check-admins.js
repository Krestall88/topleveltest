const { PrismaClient } = require('@prisma/client');

async function checkAdmins() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Проверяем администраторов в базе данных...\n');
    
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    
    console.log(`Найдено администраторов: ${admins.length}\n`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ID: ${admin.id}`);
      console.log(`   Имя: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Создан: ${admin.createdAt}`);
      console.log('');
    });
    
    // Проверяем конкретно admin@example.com
    const extraAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (extraAdmin) {
      console.log('⚠️ Найден лишний админ admin@example.com:');
      console.log(`   ID: ${extraAdmin.id}`);
      console.log(`   Имя: ${extraAdmin.name}`);
      console.log(`   Роль: ${extraAdmin.role}`);
      console.log('   Этот аккаунт будет удален.');
    } else {
      console.log('✅ Лишний админ admin@example.com не найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmins();
