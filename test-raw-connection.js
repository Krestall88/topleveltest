const { Client } = require('pg');
require('dotenv').config();

async function testRawConnection() {
  console.log('🔍 Тестируем прямое подключение к PostgreSQL...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Подключаемся...');
    await client.connect();
    console.log('✅ Подключение успешно!');

    console.log('\n📊 Проверяем данные...');
    
    // Проверяем таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`📋 Найдено таблиц: ${tablesResult.rows.length}`);
    
    // Проверяем основные таблицы
    const mainTables = ['CleaningObject', 'User', 'TechCard', 'Room', 'Task'];
    
    for (const tableName of mainTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`📊 ${tableName}: ${count} записей`);
      } catch (error) {
        console.log(`❌ ${tableName}: Таблица не найдена или ошибка`);
      }
    }
    
    // Проверяем новую таблицу
    try {
      const attachmentsResult = await client.query(`SELECT COUNT(*) FROM "ReportingTaskAttachment"`);
      const attachmentsCount = parseInt(attachmentsResult.rows[0].count);
      console.log(`📎 ReportingTaskAttachment: ${attachmentsCount} записей`);
    } catch (error) {
      console.log(`❌ ReportingTaskAttachment: Таблица не найдена - нужно создать`);
    }
    
    // Проверяем пример объекта
    try {
      const objectResult = await client.query(`
        SELECT co.name, co.id,
               (SELECT COUNT(*) FROM "Room" WHERE "objectId" = co.id) as rooms_count,
               (SELECT COUNT(*) FROM "TechCard" WHERE "objectId" = co.id) as techcards_count
        FROM "CleaningObject" co 
        LIMIT 1
      `);
      
      if (objectResult.rows.length > 0) {
        const obj = objectResult.rows[0];
        console.log(`\n🏢 Пример объекта: ${obj.name}`);
        console.log(`🏠 Помещений: ${obj.rooms_count}`);
        console.log(`📝 Техкарт: ${obj.techcards_count}`);
        
        if (obj.rooms_count > 0 && obj.techcards_count > 0) {
          console.log('\n🎉 ОТЛИЧНО! Данные полностью восстановлены!');
        } else {
          console.log('\n⚠️ ВНИМАНИЕ! Объекты без связанных данных');
        }
      }
    } catch (error) {
      console.log('❌ Ошибка проверки объекта:', error.message);
    }

  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.error('Код ошибки:', error.code);
  } finally {
    await client.end();
  }
}

testRawConnection();
