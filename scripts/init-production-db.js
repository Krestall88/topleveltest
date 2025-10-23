// Скрипт для инициализации продакшн базы данных
const { PrismaClient } = require('@prisma/client');

async function initProductionDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Инициализация продакшн базы данных...');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к БД успешно');
    
    // Создаем администратора по умолчанию
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });
    
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.create({
        data: {
          email: 'admin@cleaning.com',
          name: 'Администратор',
          role: 'ADMIN',
          password: hashedPassword
        }
      });
      
      console.log('✅ Администратор создан: admin@cleaning.com / admin123');
    } else {
      console.log('ℹ️ Администратор уже существует');
    }
    
    console.log('🎉 База данных готова к работе!');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск только если файл вызван напрямую
if (require.main === module) {
  initProductionDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initProductionDatabase };
