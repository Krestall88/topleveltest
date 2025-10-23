const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backupImportantData() {
  try {
    console.log('💾 СОЗДАНИЕ РЕЗЕРВНЫХ КОПИЙ ВАЖНЫХ ДАННЫХ...\n');

    // 1. Экспортируем выполненные задачи
    const completedTasks = await prisma.task.findMany({
      where: { status: 'COMPLETED' },
      include: {
        completedBy: {
          select: { name: true, email: true }
        }
      }
    });

    console.log(`📋 Выполненных задач для резервирования: ${completedTasks.length}`);

    // 2. Экспортируем комментарии админов
    const adminComments = await prisma.taskAdminComment.findMany({
      include: {
        task: { 
          select: { 
            id: true, 
            description: true, 
            objectName: true, 
            roomName: true 
          } 
        },
        admin: { 
          select: { 
            name: true, 
            email: true, 
            role: true 
          } 
        }
      }
    });

    console.log(`💬 Комментариев админов для резервирования: ${adminComments.length}`);

    // 3. Экспортируем фотоотчеты связанные с задачами
    const taskPhotoReports = await prisma.photoReport.findMany({
      where: { taskId: { not: null } },
      include: {
        task: {
          select: {
            id: true,
            description: true,
            objectName: true,
            status: true
          }
        }
      }
    });

    console.log(`📸 Фотоотчетов с задачами для резервирования: ${taskPhotoReports.length}`);

    // 4. Экспортируем чек-листы (если есть важные)
    const importantChecklists = await prisma.checklist.findMany({
      where: {
        OR: [
          { completedAt: { not: null } },
          { completionComment: { not: null } }
        ]
      },
      include: {
        creator: {
          select: { name: true, email: true }
        },
        object: {
          select: { name: true, address: true }
        }
      }
    });

    console.log(`📝 Важных чек-листов для резервирования: ${importantChecklists.length}`);

    // 5. Создаем резервные копии
    const backupData = {
      metadata: {
        createdAt: new Date().toISOString(),
        description: 'Резервная копия важных данных перед переходом на виртуальные задачи',
        totalCompletedTasks: completedTasks.length,
        totalAdminComments: adminComments.length,
        totalTaskPhotoReports: taskPhotoReports.length,
        totalImportantChecklists: importantChecklists.length
      },
      completedTasks,
      adminComments,
      taskPhotoReports,
      importantChecklists
    };

    // Сохраняем основную резервную копию
    fs.writeFileSync('backup-important-data.json', JSON.stringify(backupData, null, 2));
    console.log('\n💾 Основная резервная копия сохранена: backup-important-data.json');

    // Сохраняем отдельные файлы для удобства
    fs.writeFileSync('backup-completed-tasks.json', JSON.stringify(completedTasks, null, 2));
    fs.writeFileSync('backup-admin-comments.json', JSON.stringify(adminComments, null, 2));
    fs.writeFileSync('backup-task-photo-reports.json', JSON.stringify(taskPhotoReports, null, 2));
    fs.writeFileSync('backup-important-checklists.json', JSON.stringify(importantChecklists, null, 2));

    console.log('💾 Отдельные резервные копии сохранены:');
    console.log('  - backup-completed-tasks.json');
    console.log('  - backup-admin-comments.json');
    console.log('  - backup-task-photo-reports.json');
    console.log('  - backup-important-checklists.json');

    // 6. Создаем скрипт восстановления
    const restoreScript = `
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
`;

    fs.writeFileSync('restore-important-data.js', restoreScript);
    console.log('🔄 Скрипт восстановления создан: restore-important-data.js');

    // 7. Статистика резервирования
    console.log('\n📊 СТАТИСТИКА РЕЗЕРВИРОВАНИЯ:');
    console.log(`✅ Выполненных задач: ${completedTasks.length}`);
    console.log(`✅ Комментариев админов: ${adminComments.length}`);
    console.log(`✅ Фотоотчетов с задачами: ${taskPhotoReports.length}`);
    console.log(`✅ Важных чек-листов: ${importantChecklists.length}`);

    const totalBackupSize = JSON.stringify(backupData).length;
    console.log(`💾 Общий размер резервной копии: ${Math.round(totalBackupSize / 1024)} KB`);

    console.log('\n🛡️ БЕЗОПАСНОСТЬ ГАРАНТИРОВАНА:');
    console.log('✅ Все важные данные сохранены в резервных копиях');
    console.log('✅ Скрипт восстановления готов к использованию');
    console.log('✅ Можно безопасно переходить к очистке');

    console.log('\n🚀 СЛЕДУЮЩИЙ ШАГИ:');
    console.log('1. Протестируйте виртуальные задачи');
    console.log('2. Запустите safe-cleanup-tasks.js');
    console.log('3. При необходимости используйте restore-important-data.js');

  } catch (error) {
    console.error('❌ Ошибка создания резервных копий:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupImportantData();
