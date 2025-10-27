require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnectionVariants() {
  console.log('🔍 Тестируем различные варианты подключения...\n');
  
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.log('❌ DATABASE_URL не найдена');
    return;
  }
  
  // Различные варианты SSL настроек
  const variants = [
    { name: 'Оригинальный URL', url: baseUrl },
    { name: 'Без SSL', url: baseUrl.replace('?sslmode=verify-full', '?sslmode=disable') },
    { name: 'SSL require', url: baseUrl.replace('?sslmode=verify-full', '?sslmode=require') },
    { name: 'SSL prefer', url: baseUrl.replace('?sslmode=verify-full', '?sslmode=prefer') }
  ];
  
  for (const variant of variants) {
    console.log(`🔄 Тестируем: ${variant.name}`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: variant.url
        }
      }
    });
    
    try {
      await prisma.$connect();
      console.log(`✅ ${variant.name} - УСПЕШНО!`);
      
      // Быстрая проверка данных
      const count = await prisma.cleaningObject.count();
      console.log(`📊 Объектов в базе: ${count}`);
      
      await prisma.$disconnect();
      
      // Если подключение успешно, используем этот вариант
      if (count > 0) {
        console.log(`\n🎉 НАЙДЕН РАБОЧИЙ ВАРИАНТ: ${variant.name}`);
        console.log(`🔗 URL: ${variant.url.replace(/:[^:@]*@/, ':***@')}`);
        
        // Обновляем .env файл если нужно
        if (variant.url !== baseUrl) {
          console.log('\n💡 Рекомендуется обновить .env файл с рабочими настройками SSL');
        }
        
        return variant.url;
      }
      
    } catch (error) {
      console.log(`❌ ${variant.name} - ОШИБКА: ${error.message}`);
    }
    
    await prisma.$disconnect();
    console.log('');
  }
  
  console.log('❌ Ни один вариант подключения не сработал');
  console.log('\n💡 Возможные решения:');
  console.log('1. Подождать еще 5-10 минут после восстановления');
  console.log('2. Проверить статус базы данных в панели Timeweb');
  console.log('3. Перезапустить базу данных в панели управления');
  console.log('4. Проверить, не изменились ли настройки подключения');
}

testConnectionVariants();
