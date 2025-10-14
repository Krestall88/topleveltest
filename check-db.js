// Проверка подключения к базе данных
const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  console.log('🔍 Проверка подключения к базе данных...');
  
  const prisma = new PrismaClient();
  
  try {
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');
    
    // Проверяем пользователей
    const users = await prisma.user.findMany();
    console.log(`👥 Найдено пользователей: ${users.length}`);
    
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Проверяем админа
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });
    
    if (admin) {
      console.log('✅ Администратор найден');
    } else {
      console.log('❌ Администратор НЕ найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка подключения к базе:', error.message);
    console.log('\n💡 Возможные причины:');
    console.log('1. Неправильный DATABASE_URL в .env.local');
    console.log('2. База данных недоступна');
    console.log('3. Неправильные учетные данные');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
