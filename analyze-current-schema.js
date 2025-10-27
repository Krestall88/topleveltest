const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function analyzeCurrentSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 АНАЛИЗ ТЕКУЩЕЙ СХЕМЫ БАЗЫ ДАННЫХ...\n');
    
    // Читаем текущую схему Prisma
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    
    // Извлекаем все модели
    const modelMatches = schemaContent.match(/model\s+(\w+)\s*{[^}]+}/g);
    
    if (modelMatches) {
      console.log('📊 НАЙДЕННЫЕ МОДЕЛИ В СХЕМЕ:');
      modelMatches.forEach((model, index) => {
        const modelName = model.match(/model\s+(\w+)/)[1];
        console.log(`${index + 1}. ${modelName}`);
      });
    }
    
    console.log('\n🔍 ПРОВЕРЯЕМ СОСТОЯНИЕ КАЖДОЙ ТАБЛИЦЫ:');
    
    // Проверяем основные таблицы
    const tables = [
      'CleaningObject',
      'Room', 
      'ObjectStructure',
      'TechCard',
      'Task',
      'User',
      'ReportingTask',
      'ReportingTaskAttachment',
      'PhotoReport',
      'Checklist',
      'AdditionalTask',
      'Request'
    ];
    
    for (const tableName of tables) {
      try {
        const count = await prisma[tableName.charAt(0).toLowerCase() + tableName.slice(1)].count();
        console.log(`✅ ${tableName}: ${count} записей`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${tableName}: Таблица не существует`);
        } else {
          console.log(`⚠️ ${tableName}: Ошибка доступа - ${error.message}`);
        }
      }
    }
    
    // Проверяем связи между таблицами
    console.log('\n🔗 ПРОВЕРЯЕМ СВЯЗИ МЕЖДУ ТАБЛИЦАМИ:');
    
    try {
      const objectWithRelations = await prisma.cleaningObject.findFirst({
        include: {
          rooms: true,
          techCards: true,
          objectStructures: true,
          manager: true,
          reportingTasks: true
        }
      });
      
      if (objectWithRelations) {
        console.log('✅ Связи CleaningObject работают:');
        console.log(`   - Помещений: ${objectWithRelations.rooms?.length || 0}`);
        console.log(`   - Техкарт: ${objectWithRelations.techCards?.length || 0}`);
        console.log(`   - Структур: ${objectWithRelations.objectStructures?.length || 0}`);
        console.log(`   - Менеджер: ${objectWithRelations.manager ? 'Назначен' : 'Не назначен'}`);
        console.log(`   - Задач отчетности: ${objectWithRelations.reportingTasks?.length || 0}`);
      }
    } catch (error) {
      console.log('❌ Ошибка проверки связей:', error.message);
    }
    
    // Сохраняем текущую схему
    console.log('\n💾 СОХРАНЯЕМ ТЕКУЩУЮ СХЕМУ...');
    
    const backupSchema = {
      timestamp: new Date().toISOString(),
      schemaContent: schemaContent,
      models: modelMatches ? modelMatches.map(model => {
        const modelName = model.match(/model\s+(\w+)/)[1];
        return {
          name: modelName,
          content: model
        };
      }) : []
    };
    
    fs.writeFileSync('current-schema-backup.json', JSON.stringify(backupSchema, null, 2));
    console.log('✅ Схема сохранена в current-schema-backup.json');
    
    console.log('\n📋 ВЫВОДЫ:');
    console.log('🔧 Функционал (UI, API, логика) - сохранен в коде');
    console.log('📊 Данные (записи в таблицах) - нужно восстановить из бэкапа');
    console.log('🏗️ Структура БД (таблицы, связи) - описана в schema.prisma');
    
    console.log('\n💡 ПОСЛЕ ВОССТАНОВЛЕНИЯ НУЖНО:');
    console.log('1. Проверить что все таблицы восстановились');
    console.log('2. Добавить ТОЛЬКО новую таблицу ReportingTaskAttachment');
    console.log('3. Весь остальной функционал должен работать как раньше');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCurrentSchema();
