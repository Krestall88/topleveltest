const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔐 Сброс пароля администратора...\n');
    
    // Найдем админа
    const admin = await prisma.user.findFirst({
      where: { 
        email: 'admin@cleaning.com',
        role: 'ADMIN' 
      }
    });
    
    if (!admin) {
      console.log('❌ Администратор не найден');
      return;
    }
    
    console.log('👤 Найден администратор:', admin.name);
    console.log('📧 Email:', admin.email);
    
    // Создаем правильный хеш для пароля admin123 с помощью bcryptjs
    const newPassword = 'admin123';
    console.log('🔧 Создание хеша пароля...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('🔑 Хеш создан:', hashedPassword.substring(0, 20) + '...');
    
    // Обновляем пароль
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Пароль успешно обновлен!');
    console.log('\n📋 Данные для входа:');
    console.log('   Email: admin@cleaning.com');
    console.log('   Пароль: admin123');
    
    // Проверим количество менеджеров и объектов
    const managersCount = await prisma.user.count({ where: { role: 'MANAGER' } });
    const objectsCount = await prisma.cleaningObject.count();
    
    console.log('\n📊 Статистика системы:');
    console.log(`   Менеджеров: ${managersCount}`);
    console.log(`   Объектов: ${objectsCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
