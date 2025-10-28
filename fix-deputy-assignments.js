const { PrismaClient } = require('@prisma/client');

async function fixDeputyAssignments() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ НАЗНАЧЕНИЙ ЗАМЕСТИТЕЛЯ\n');
    
    // Найдем тестового заместителя
    const deputy = await prisma.user.findFirst({
      where: {
        email: 'test.deputy.calendar@cleaning.com',
        role: 'DEPUTY_ADMIN'
      }
    });
    
    if (!deputy) {
      console.log('❌ Тестовый заместитель не найден');
      return;
    }
    
    console.log(`👤 Найден заместитель: ${deputy.name}`);
    
    // Проверим текущие назначения
    const currentAssignments = await prisma.deputyAdminAssignment.findMany({
      where: { deputyAdminId: deputy.id },
      include: {
        object: {
          select: { name: true }
        }
      }
    });
    
    console.log(`📋 Текущие назначения: ${currentAssignments.length}`);
    currentAssignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ${assignment.object.name}`);
    });
    
    // Если назначений нет, создадим их
    if (currentAssignments.length === 0) {
      console.log('\n🔨 Создаем назначения для заместителя...');
      
      // Получим первые 5 объектов для назначения
      const objectsToAssign = await prisma.cleaningObject.findMany({
        take: 5,
        select: { id: true, name: true }
      });
      
      console.log(`🏢 Назначаем объекты (${objectsToAssign.length}):`);
      
      for (const obj of objectsToAssign) {
        await prisma.deputyAdminAssignment.create({
          data: {
            deputyAdminId: deputy.id,
            objectId: obj.id,
            assignedById: deputy.id, // Назначаем сами себе для теста
            assignedAt: new Date()
          }
        });
        
        console.log(`   ✅ ${obj.name}`);
      }
    }
    
    // Теперь исправим проблему с менеджерами без объектов
    console.log('\n🔧 ИСПРАВЛЕНИЕ МЕНЕДЖЕРОВ БЕЗ ОБЪЕКТОВ');
    
    // Найдем менеджеров без объектов
    const managersWithoutObjects = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        managedObjects: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`👥 Менеджеров без объектов: ${managersWithoutObjects.length}`);
    
    if (managersWithoutObjects.length > 0) {
      // Найдем объекты без менеджеров
      const objectsWithoutManagers = await prisma.cleaningObject.findMany({
        where: {
          OR: [
            { managerId: null },
            { managerId: '' }
          ]
        },
        select: {
          id: true,
          name: true,
          address: true
        }
      });
      
      console.log(`🏢 Объектов без менеджеров: ${objectsWithoutManagers.length}`);
      
      // Назначаем объекты менеджерам
      let assignmentCount = 0;
      for (let i = 0; i < Math.min(managersWithoutObjects.length, objectsWithoutManagers.length); i++) {
        const manager = managersWithoutObjects[i];
        const object = objectsWithoutManagers[i];
        
        await prisma.cleaningObject.update({
          where: { id: object.id },
          data: { managerId: manager.id }
        });
        
        console.log(`   ✅ ${manager.name} → ${object.name}`);
        assignmentCount++;
      }
      
      console.log(`\n📊 Назначено связей: ${assignmentCount}`);
    }
    
    // Проверим результат
    console.log('\n✅ ПРОВЕРКА РЕЗУЛЬТАТОВ:');
    
    // Проверяем назначения заместителя
    const newAssignments = await prisma.deputyAdminAssignment.count({
      where: { deputyAdminId: deputy.id }
    });
    console.log(`   👤 Заместитель имеет назначений: ${newAssignments}`);
    
    // Проверяем менеджеров с объектами
    const managersWithObjects = await prisma.user.count({
      where: {
        role: 'MANAGER',
        managedObjects: {
          some: {}
        }
      }
    });
    console.log(`   👥 Менеджеров с объектами: ${managersWithObjects}`);
    
  } catch (error) {
    console.error('❌ Ошибка исправления:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDeputyAssignments();
