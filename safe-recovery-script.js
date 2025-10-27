const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function safeRecovery() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 БЕЗОПАСНОЕ ВОССТАНОВЛЕНИЕ БАЗЫ ДАННЫХ...\n');
    
    // 1. Сохраняем текущие важные данные
    console.log('💾 Сохраняем текущие данные...');
    
    const currentUsers = await prisma.user.findMany();
    const currentReportingTasks = await prisma.reportingTask.findMany({
      include: {
        createdBy: true,
        assignedTo: true,
        object: true
      }
    });
    const currentAttachments = await prisma.reportingTaskAttachment.findMany({
      include: {
        uploadedBy: true
      }
    });
    
    const backupData = {
      timestamp: new Date().toISOString(),
      users: currentUsers,
      reportingTasks: currentReportingTasks,
      attachments: currentAttachments
    };
    
    fs.writeFileSync('current-data-backup.json', JSON.stringify(backupData, null, 2));
    console.log('✅ Данные сохранены в current-data-backup.json');
    
    // 2. Анализируем что нужно восстановить
    console.log('\n📊 АНАЛИЗ ПОТЕРЬ:');
    
    const objectsWithoutData = await prisma.cleaningObject.findMany({
      include: {
        rooms: true,
        techCards: true,
        objectStructures: true,
        manager: true
      }
    });
    
    let objectsNeedingRecovery = 0;
    objectsWithoutData.forEach(obj => {
      if (obj.rooms.length === 0 && obj.techCards.length === 0 && obj.objectStructures.length === 0) {
        objectsNeedingRecovery++;
      }
    });
    
    console.log(`❌ Объектов без данных: ${objectsNeedingRecovery} из ${objectsWithoutData.length}`);
    console.log(`👥 Пользователей: ${currentUsers.length}`);
    console.log(`📊 Задач отчетности: ${currentReportingTasks.length}`);
    console.log(`📎 Вложений: ${currentAttachments.length}`);
    
    // 3. Создаем SQL для добавления новой таблицы
    console.log('\n📝 Создаем миграцию для новой таблицы...');
    
    const migrationSQL = `
-- Добавляем таблицу ReportingTaskAttachment если её нет
CREATE TABLE IF NOT EXISTS "ReportingTaskAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "ReportingTaskAttachment_pkey" PRIMARY KEY ("id")
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS "ReportingTaskAttachment_taskId_idx" ON "ReportingTaskAttachment"("taskId");
CREATE INDEX IF NOT EXISTS "ReportingTaskAttachment_uploadedById_idx" ON "ReportingTaskAttachment"("uploadedById");

-- Добавляем внешние ключи
ALTER TABLE "ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ReportingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportingTaskAttachment" ADD CONSTRAINT "ReportingTaskAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;
    
    fs.writeFileSync('add-attachments-table.sql', migrationSQL);
    console.log('✅ SQL миграция сохранена в add-attachments-table.sql');
    
    // 4. Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('1. 🔄 Восстановите базу из резервной копии 26.10.2025 15:02');
    console.log('2. 📝 Выполните SQL из файла add-attachments-table.sql');
    console.log('3. 🔧 Запустите: npx prisma generate');
    console.log('4. 📊 Импортируйте данные из current-data-backup.json (если нужно)');
    console.log('5. ✅ Проверьте работу системы');
    
    console.log('\n⚠️ ВНИМАНИЕ:');
    console.log('- Критически важные файлы НЕ ТРОГАТЬ!');
    console.log('- unified-task-system.ts и связанные компоненты');
    console.log('- Настройки модальных окон задач');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

safeRecovery();
