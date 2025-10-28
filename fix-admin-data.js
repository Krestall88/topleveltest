const { PrismaClient } = require('@prisma/client');

async function fixAdminData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 ВОССТАНОВЛЕНИЕ ДАННЫХ ГЛАВНОГО АДМИНИСТРАТОРА\n');
    
    // Найдем главного админа
    const mainAdmin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });
    
    if (mainAdmin) {
      console.log('📋 Текущие данные главного админа:');
      console.log(`   ID: ${mainAdmin.id}`);
      console.log(`   Имя: ${mainAdmin.name}`);
      console.log(`   Email: ${mainAdmin.email}`);
      
      // Восстанавливаем правильные данные
      console.log('\n🔄 Восстанавливаем правильные данные...');
      const updatedAdmin = await prisma.user.update({
        where: {
          id: mainAdmin.id
        },
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com'
        }
      });
      
      console.log('✅ Данные главного админа восстановлены:');
      console.log(`   Имя: ${updatedAdmin.name}`);
      console.log(`   Email: ${updatedAdmin.email}`);
      
    } else {
      console.log('❌ Главный администратор не найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка восстановления данных админа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminData();
