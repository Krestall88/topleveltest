const { PrismaClient } = require('@prisma/client');

async function analyzeDatabaseChanges() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 АНАЛИЗ СОСТОЯНИЯ БАЗЫ ДАННЫХ...\n');
    
    // Проверяем все основные таблицы
    console.log('📊 СОСТОЯНИЕ ОСНОВНЫХ ТАБЛИЦ:');
    
    // 1. CleaningObject - объекты
    const objectsCount = await prisma.cleaningObject.count();
    console.log(`🏢 CleaningObject: ${objectsCount} записей`);
    
    if (objectsCount > 0) {
      const sampleObject = await prisma.cleaningObject.findFirst({
        include: {
          rooms: true,
          techCards: true,
          objectStructures: true,
          manager: { select: { name: true, email: true } }
        }
      });
      
      console.log(`   📋 Пример объекта: ${sampleObject.name}`);
      console.log(`   🏠 Помещений: ${sampleObject.rooms?.length || 0}`);
      console.log(`   🏗️ Структур: ${sampleObject.objectStructures?.length || 0}`);
      console.log(`   📝 Техкарт: ${sampleObject.techCards?.length || 0}`);
      console.log(`   👤 Менеджер: ${sampleObject.manager?.name || 'НЕ НАЗНАЧЕН'}`);
    }
    
    // 2. ObjectStructure - структуры объектов
    const objectStructuresCount = await prisma.objectStructure.count();
    console.log(`\n🏗️ ObjectStructure: ${objectStructuresCount} записей`);
    
    // 3. Room - помещения
    const roomsCount = await prisma.room.count();
    console.log(`🏠 Room: ${roomsCount} записей`);
    
    // 3. TechCard - техкарты
    const techCardsCount = await prisma.techCard.count();
    console.log(`📝 TechCard: ${techCardsCount} записей`);
    
    // 4. User - пользователи
    const usersCount = await prisma.user.count();
    console.log(`👥 User: ${usersCount} записей`);
    
    // 5. Task - задачи
    const tasksCount = await prisma.task.count();
    console.log(`📋 Task: ${tasksCount} записей`);
    
    // 6. ReportingTask - задачи отчетности
    const reportingTasksCount = await prisma.reportingTask.count();
    console.log(`📊 ReportingTask: ${reportingTasksCount} записей`);
    
    // 7. ReportingTaskAttachment - новая таблица вложений
    const attachmentsCount = await prisma.reportingTaskAttachment.count();
    console.log(`📎 ReportingTaskAttachment: ${attachmentsCount} записей (НОВАЯ ТАБЛИЦА)`);
    
    // 8. PhotoReport - фотоотчеты
    const photoReportsCount = await prisma.photoReport.count();
    console.log(`📸 PhotoReport: ${photoReportsCount} записей`);
    
    // Проверяем последние изменения в схеме
    console.log('\n🔄 АНАЛИЗ ПОСЛЕДНИХ ИЗМЕНЕНИЙ:');
    
    // Проверяем, есть ли новые поля в существующих таблицах
    const sampleUser = await prisma.user.findFirst();
    if (sampleUser) {
      console.log('👤 Поля в таблице User:');
      Object.keys(sampleUser).forEach(key => {
        console.log(`   - ${key}`);
      });
    }
    
    // Проверяем ReportingTask
    const sampleReportingTask = await prisma.reportingTask.findFirst();
    if (sampleReportingTask) {
      console.log('\n📊 Поля в таблице ReportingTask:');
      Object.keys(sampleReportingTask).forEach(key => {
        console.log(`   - ${key}`);
      });
    }
    
    console.log('\n🚨 КРИТИЧЕСКАЯ ИНФОРМАЦИЯ:');
    console.log('❌ Проблема: Объекты восстановлены БЕЗ структур и техкарт');
    console.log('❌ Потеряны связи между объектами и их компонентами');
    console.log('❌ Менеджеры объектов не назначены');
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('1. Восстановить из резервной копии от 26.10.2025 15:02');
    console.log('2. Затем применить ТОЛЬКО новые изменения (таблица ReportingTaskAttachment)');
    console.log('3. Проверить совместимость новых полей');
    
    console.log('\n📋 ЧТО ДОБАВЛЕНО С 26 ОКТЯБРЯ:');
    console.log('✅ Таблица ReportingTaskAttachment (вложения к задачам отчетности)');
    console.log('✅ API /api/reporting/tasks/[id]/attachments');
    console.log('✅ Обновленный ReportingTaskModal с функционалом фотографий');
    console.log('❓ Возможно другие мелкие изменения...');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabaseChanges();
