const { PrismaClient } = require('@prisma/client');

async function checkDeputyTasks() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 ПРОВЕРКА ЗАДАЧ ЗАМЕСТИТЕЛЯ\n');
    
    // Найдем заместителя
    const deputy = await prisma.user.findFirst({
      where: {
        email: 'test.deputy.calendar@cleaning.com',
        role: 'DEPUTY_ADMIN'
      }
    });
    
    if (!deputy) {
      console.log('❌ Заместитель не найден');
      return;
    }
    
    console.log(`👤 Заместитель: ${deputy.name}`);
    
    // Проверим назначенные объекты
    const assignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: deputy.id },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            managerId: true,
            manager: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    console.log(`🏢 Назначенных объектов: ${assignments.length}`);
    assignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ${assignment.object.name}`);
      console.log(`      Менеджер: ${assignment.object.manager?.name || 'Не назначен'}`);
    });
    
    if (assignments.length === 0) {
      console.log('❌ У заместителя нет назначенных объектов');
      return;
    }
    
    const objectIds = assignments.map(a => a.objectId);
    
    // Проверим техкарты по этим объектам
    const techCards = await prisma.techCard.count({
      where: {
        objectId: { in: objectIds }
      }
    });
    
    console.log(`📋 Техкарт по назначенным объектам: ${techCards}`);
    
    // Проверим материализованные задачи
    const materializedTasks = await prisma.task.count({
      where: {
        objectName: {
          in: assignments.map(a => a.object.name)
        }
      }
    });
    
    console.log(`✅ Материализованных задач: ${materializedTasks}`);
    
    // Проверим задачи за последние 7 дней
    const recentTasks = await prisma.task.findMany({
      where: {
        objectName: {
          in: assignments.map(a => a.object.name)
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        description: true,
        objectName: true,
        status: true,
        createdAt: true
      },
      take: 5
    });
    
    console.log(`📅 Задач за последние 7 дней: ${recentTasks.length}`);
    recentTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.description}`);
      console.log(`      Объект: ${task.objectName}`);
      console.log(`      Статус: ${task.status}`);
      console.log(`      Создана: ${task.createdAt.toLocaleDateString('ru-RU')}`);
    });
    
    // Если задач мало, создадим несколько тестовых
    if (materializedTasks < 5) {
      console.log('\n🔧 Создаем тестовые задачи для заместителя...');
      
      for (let i = 0; i < Math.min(3, assignments.length); i++) {
        const assignment = assignments[i];
        
        const testTask = await prisma.task.create({
          data: {
            description: `Тестовая задача для ${assignment.object.name}`,
            objectName: assignment.object.name,
            objectId: assignment.object.id,
            managerId: assignment.object.managerId || deputy.id,
            managerName: assignment.object.manager?.name || deputy.name,
            status: 'AVAILABLE',
            scheduledDate: new Date(),
            createdAt: new Date(),
            failureReason: 'Ежедневно' // Для совместимости
          }
        });
        
        console.log(`   ✅ Создана задача: ${testTask.description}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDeputyTasks();
