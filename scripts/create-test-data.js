const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🏗️ Создаем тестовые данные...\n');
    
    // Создаем администратора
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Администратор',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('✅ Администратор создан:', admin.name);
    
    // Создаем менеджера
    const managerPassword = await bcrypt.hash('manager123', salt);
    const manager = await prisma.user.upsert({
      where: { email: 'manager@example.com' },
      update: {},
      create: {
        email: 'manager@example.com',
        name: 'Тестовый Менеджер',
        password: managerPassword,
        role: 'MANAGER'
      }
    });
    console.log('✅ Менеджер создан:', manager.name);
    
    // Создаем объект
    const object = await prisma.cleaningObject.upsert({
      where: { id: 'test-object-id' },
      update: {},
      create: {
        id: 'test-object-id',
        name: 'Тестовый объект для задач',
        address: 'Тестовый адрес, 123',
        creatorId: admin.id,
        managerId: manager.id
      }
    });
    console.log('✅ Объект создан:', object.name);
    
    // Исключаем объект из автоматических задач
    await prisma.excludedObject.upsert({
      where: { objectId: object.id },
      update: {},
      create: {
        objectId: object.id,
        excludedById: admin.id
      }
    });
    console.log('✅ Объект исключен из автоматических задач');
    
    // Создаем тестовую задачу отчетности
    const task = await prisma.reportingTask.create({
      data: {
        title: 'Тестовая задача управления',
        description: 'Описание тестовой задачи для проверки функционала',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // завтра
        objectId: object.id,
        createdById: admin.id,
        assignedToId: manager.id
      }
    });
    console.log('✅ Задача создана:', task.title);
    
    // Добавляем комментарий к задаче
    const comment = await prisma.reportingTaskComment.create({
      data: {
        content: 'Тестовый комментарий от администратора',
        taskId: task.id,
        authorId: admin.id
      }
    });
    console.log('✅ Комментарий добавлен:', comment.content);
    
    // Добавляем вложение к задаче
    const attachment = await prisma.reportingTaskAttachment.create({
      data: {
        fileName: 'test-photo.jpg',
        originalName: 'Тестовое фото.jpg',
        fileSize: 1024000,
        mimeType: 'image/jpeg',
        filePath: '/uploads/test-photo.jpg',
        taskId: task.id,
        uploadedById: admin.id
      }
    });
    console.log('✅ Вложение добавлено:', attachment.originalName);
    
    console.log('\n🎉 Тестовые данные созданы успешно!');
    console.log('\n📋 Данные для тестирования:');
    console.log(`Администратор: admin@example.com / admin123`);
    console.log(`Менеджер: manager@example.com / manager123`);
    console.log(`Объект ID: ${object.id}`);
    console.log(`Задача ID: ${task.id}`);
    
  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
