const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testReportingTasks() {
  try {
    console.log('🔍 Проверяем доступность таблицы ReportingTask...');
    
    // Проверяем существование таблицы
    const count = await prisma.reportingTask.count();
    console.log(`✅ Таблица ReportingTask доступна. Записей: ${count}`);
    
    // Проверяем объект из ошибки
    const objectId = 'cmgz3mgg20001vyaw622revyh';
    console.log(`\n🔍 Проверяем объект: ${objectId}`);
    
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, name: true, managerId: true }
    });
    
    if (object) {
      console.log(`✅ Объект найден: ${object.name}`);
      console.log(`   Менеджер ID: ${object.managerId}`);
    } else {
      console.log(`❌ Объект не найден`);
      return;
    }
    
    // Проверяем таблицу ExcludedObject
    console.log('\n🔍 Проверяем таблицу ExcludedObject...');
    try {
      const excludedCheck = await prisma.$queryRaw`
        SELECT "objectId" FROM "ExcludedObject" WHERE "objectId" = ${objectId}
      `;
      console.log(`✅ Таблица ExcludedObject доступна. Исключений для объекта: ${excludedCheck.length}`);
      
      if (excludedCheck.length === 0) {
        console.log('⚠️ Объект НЕ исключен из автоматических задач');
        console.log('   Это может быть причиной ошибки 400');
        
        // Добавляем объект в исключения для тестирования
        console.log('\n🔧 Добавляем объект в исключения...');
        
        // Сначала найдем администратора
        const admin = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true, name: true }
        });
        
        if (admin) {
          await prisma.excludedObject.create({
            data: {
              objectId: objectId,
              excludedById: admin.id,
              reason: 'Тестовое исключение для отчетности'
            }
          });
          console.log(`✅ Объект добавлен в исключения администратором ${admin.name}`);
        } else {
          console.log('❌ Администратор не найден');
        }
      } else {
        console.log('✅ Объект исключен из автоматических задач');
      }
    } catch (error) {
      console.log('❌ Ошибка при работе с таблицей ExcludedObject:', error.message);
    }
    
    // Проверяем задачи отчетности для объекта
    console.log('\n🔍 Проверяем задачи отчетности для объекта...');
    const tasks = await prisma.reportingTask.findMany({
      where: { objectId: objectId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } }
      }
    });
    
    console.log(`✅ Найдено задач отчетности: ${tasks.length}`);
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} (${task.status})`);
      console.log(`      Создал: ${task.createdBy.name}, Назначена: ${task.assignedTo.name}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    console.error('   Сообщение:', error.message);
    if (error.code) {
      console.error('   Код ошибки:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testReportingTasks();
