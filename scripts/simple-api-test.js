const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function simpleTest() {
  try {
    console.log('🔍 Простой тест API управления задачами...\n');
    
    // Проверяем пользователей
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    console.log('👥 Пользователи в базе:');
    users.forEach(user => {
      console.log(`   ${user.name} (${user.email}) - ${user.role}`);
    });
    
    // Проверяем объекты
    const objects = await prisma.cleaningObject.findMany({
      select: { id: true, name: true, address: true }
    });
    console.log('\n🏢 Объекты в базе:');
    objects.forEach(obj => {
      console.log(`   ${obj.name} (${obj.id})`);
    });
    
    // Проверяем задачи отчетности
    const tasks = await prisma.reportingTask.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } }
      }
    });
    console.log('\n📋 Задачи отчетности:');
    tasks.forEach(task => {
      console.log(`   ${task.title} (${task.status}) - ${task.createdBy.name} → ${task.assignedTo.name}`);
    });
    
    // Проверяем комментарии
    const comments = await prisma.reportingTaskComment.findMany({
      select: {
        id: true,
        content: true,
        author: { select: { name: true } },
        task: { select: { title: true } }
      }
    });
    console.log('\n💬 Комментарии:');
    comments.forEach(comment => {
      console.log(`   "${comment.content}" - ${comment.author.name} к задаче "${comment.task.title}"`);
    });
    
    // Тестируем создание новой задачи напрямую через Prisma
    if (users.length > 0 && objects.length > 0) {
      const admin = users.find(u => u.role === 'ADMIN');
      const manager = users.find(u => u.role === 'MANAGER');
      const testObject = objects[0];
      
      if (admin && manager) {
        console.log('\n🧪 Создаем тестовую задачу через Prisma...');
        
        const newTask = await prisma.reportingTask.create({
          data: {
            title: 'Прямая тестовая задача',
            description: 'Создана напрямую через Prisma для тестирования',
            priority: 'MEDIUM',
            objectId: testObject.id,
            createdById: admin.id,
            assignedToId: manager.id
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdBy: { select: { name: true } },
            assignedTo: { select: { name: true } }
          }
        });
        
        console.log('✅ Задача создана через Prisma:');
        console.log(`   ID: ${newTask.id}`);
        console.log(`   Название: ${newTask.title}`);
        console.log(`   Статус: ${newTask.status}`);
        console.log(`   Создал: ${newTask.createdBy.name}`);
        console.log(`   Назначена: ${newTask.assignedTo.name}`);
        
        // Добавляем комментарий
        const newComment = await prisma.reportingTaskComment.create({
          data: {
            content: 'Тестовый комментарий через Prisma',
            taskId: newTask.id,
            authorId: admin.id
          },
          select: {
            id: true,
            content: true,
            author: { select: { name: true } }
          }
        });
        
        console.log('✅ Комментарий добавлен:');
        console.log(`   "${newComment.content}" - ${newComment.author.name}`);
      }
    }
    
    console.log('\n🎉 Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest();
