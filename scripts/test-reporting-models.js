const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testReportingModels() {
  try {
    console.log('🔍 Тестируем новые модели для задач отчетности...\n');
    
    // Проверяем доступность новых моделей
    console.log('📋 Проверяем модель ReportingTaskComment...');
    try {
      const commentCount = await prisma.reportingTaskComment.count();
      console.log(`✅ ReportingTaskComment доступна. Записей: ${commentCount}`);
    } catch (error) {
      console.log('❌ ReportingTaskComment недоступна:', error.message);
    }
    
    console.log('\n📎 Проверяем модель ReportingTaskAttachment...');
    try {
      const attachmentCount = await prisma.reportingTaskAttachment.count();
      console.log(`✅ ReportingTaskAttachment доступна. Записей: ${attachmentCount}`);
    } catch (error) {
      console.log('❌ ReportingTaskAttachment недоступна:', error.message);
    }
    
    // Проверяем существующие задачи отчетности
    console.log('\n🔍 Проверяем существующие задачи отчетности...');
    const tasks = await prisma.reportingTask.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } }
      },
      take: 3
    });
    
    console.log(`📋 Найдено задач: ${tasks.length}`);
    
    if (tasks.length > 0) {
      const testTask = tasks[0];
      console.log(`\n🧪 Тестируем с задачей: "${testTask.title}"`);
      
      // Найдем администратора для тестов
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, name: true }
      });
      
      if (admin) {
        console.log(`👤 Найден администратор: ${admin.name}`);
        
        // Тестируем создание комментария
        console.log('\n💬 Создаем тестовый комментарий...');
        try {
          const comment = await prisma.reportingTaskComment.create({
            data: {
              content: 'Тестовый комментарий от администратора',
              taskId: testTask.id,
              authorId: admin.id
            },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: { select: { name: true } }
            }
          });
          
          console.log('✅ Комментарий создан:');
          console.log(`   ID: ${comment.id}`);
          console.log(`   Автор: ${comment.author.name}`);
          console.log(`   Содержание: ${comment.content}`);
          
          // Проверяем загрузку задачи с комментариями
          console.log('\n🔍 Загружаем задачу с комментариями...');
          const taskWithComments = await prisma.reportingTask.findUnique({
            where: { id: testTask.id },
            select: {
              id: true,
              title: true,
              comments: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  author: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
              }
            }
          });
          
          console.log(`✅ Задача загружена с ${taskWithComments.comments.length} комментариями`);
          
        } catch (error) {
          console.log('❌ Ошибка создания комментария:', error.message);
        }
        
        // Тестируем создание вложения (имитация)
        console.log('\n📎 Создаем тестовое вложение...');
        try {
          const attachment = await prisma.reportingTaskAttachment.create({
            data: {
              fileName: 'test-photo.jpg',
              originalName: 'Фотоотчет.jpg',
              fileSize: 1024000,
              mimeType: 'image/jpeg',
              filePath: '/uploads/reporting/test-photo.jpg',
              taskId: testTask.id,
              uploadedById: admin.id
            },
            select: {
              id: true,
              originalName: true,
              fileSize: true,
              createdAt: true,
              uploadedBy: { select: { name: true } }
            }
          });
          
          console.log('✅ Вложение создано:');
          console.log(`   ID: ${attachment.id}`);
          console.log(`   Файл: ${attachment.originalName}`);
          console.log(`   Размер: ${Math.round(attachment.fileSize / 1024)} KB`);
          console.log(`   Загрузил: ${attachment.uploadedBy.name}`);
          
        } catch (error) {
          console.log('❌ Ошибка создания вложения:', error.message);
        }
        
      } else {
        console.log('❌ Администратор не найден');
      }
    }
    
    console.log('\n🎉 Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReportingModels();
