require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Тестируем подключение к базе данных...\n');
  
  // Проверяем переменные окружения
  console.log('📊 Переменные окружения:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Установлена' : 'НЕ УСТАНОВЛЕНА');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Установлена' : 'НЕ УСТАНОВЛЕНА');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найдена в .env файле');
    return;
  }
  
  // Маскируем чувствительную информацию
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@');
  console.log('🔗 URL подключения:', maskedUrl);
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    console.log('\n🔄 Попытка подключения...');
    
    // Простой запрос для проверки подключения
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно!');
    
    // Проверяем количество записей в основных таблицах
    console.log('\n📊 Проверяем восстановленные данные:');
    
    const objectsCount = await prisma.cleaningObject.count();
    console.log(`🏢 Объектов: ${objectsCount}`);
    
    const usersCount = await prisma.user.count();
    console.log(`👥 Пользователей: ${usersCount}`);
    
    const techCardsCount = await prisma.techCard.count();
    console.log(`📝 Техкарт: ${techCardsCount}`);
    
    const roomsCount = await prisma.room.count();
    console.log(`🏠 Помещений: ${roomsCount}`);
    
    const tasksCount = await prisma.task.count();
    console.log(`📋 Задач: ${tasksCount}`);
    
    // Проверяем, есть ли данные в объектах
    if (objectsCount > 0) {
      const sampleObject = await prisma.cleaningObject.findFirst({
        include: {
          rooms: true,
          techCards: true,
          manager: { select: { name: true, email: true } }
        }
      });
      
      console.log('\n🔍 Пример объекта:');
      console.log(`📋 Название: ${sampleObject.name}`);
      console.log(`🏠 Помещений: ${sampleObject.rooms?.length || 0}`);
      console.log(`📝 Техкарт: ${sampleObject.techCards?.length || 0}`);
      console.log(`👤 Менеджер: ${sampleObject.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      
      if (sampleObject.rooms?.length > 0 && sampleObject.techCards?.length > 0) {
        console.log('\n🎉 ОТЛИЧНО! Данные полностью восстановлены!');
      } else {
        console.log('\n⚠️ ВНИМАНИЕ! Объекты без данных - возможно, восстановление не завершено');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.error('Код ошибки:', error.code);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Возможные причины:');
      console.log('1. База данных еще восстанавливается');
      console.log('2. Изменились настройки подключения');
      console.log('3. Проблемы с сетью');
      console.log('4. Нужно подождать еще несколько минут');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
