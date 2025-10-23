
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restoreImportantData() {
  try {
    console.log('🔄 ВОССТАНОВЛЕНИЕ ВАЖНЫХ ДАННЫХ...');
    
    const backupData = JSON.parse(fs.readFileSync('backup-important-data.json', 'utf8'));
    
    console.log('📋 Восстанавливаем выполненные задачи...');
    for (const task of backupData.completedTasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: task,
        create: task
      });
    }
    
    console.log('💬 Восстанавливаем комментарии админов...');
    for (const comment of backupData.adminComments) {
      await prisma.taskAdminComment.upsert({
        where: { id: comment.id },
        update: comment,
        create: comment
      });
    }
    
    console.log('📸 Восстанавливаем фотоотчеты...');
    for (const report of backupData.taskPhotoReports) {
      await prisma.photoReport.upsert({
        where: { id: report.id },
        update: report,
        create: report
      });
    }
    
    console.log('✅ Восстановление завершено!');
  } catch (error) {
    console.error('❌ Ошибка восстановления:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreImportantData();
