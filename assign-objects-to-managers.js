const { PrismaClient } = require('@prisma/client');

async function assignObjectsToManagers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 НАЗНАЧЕНИЕ ОБЪЕКТОВ МЕНЕДЖЕРАМ\n');
    
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
    managersWithoutObjects.forEach((manager, index) => {
      console.log(`   ${index + 1}. ${manager.name}`);
    });
    
    if (managersWithoutObjects.length === 0) {
      console.log('✅ Все менеджеры уже имеют объекты');
      return;
    }
    
    // Найдем менеджеров с большим количеством объектов (больше 3)
    const managersWithManyObjects = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        managedObjects: {
          some: {}
        }
      },
      select: {
        id: true,
        name: true,
        managedObjects: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });
    
    // Фильтруем тех, у кого больше 2 объектов
    const managersToRedistribute = managersWithManyObjects.filter(m => m.managedObjects.length > 2);
    
    console.log(`\n🔄 Менеджеров с избытком объектов (>2): ${managersToRedistribute.length}`);
    managersToRedistribute.forEach((manager, index) => {
      console.log(`   ${index + 1}. ${manager.name}: ${manager.managedObjects.length} объектов`);
    });
    
    // Перераспределяем объекты
    let redistributionCount = 0;
    
    for (let i = 0; i < managersWithoutObjects.length && redistributionCount < managersWithoutObjects.length; i++) {
      const managerWithoutObjects = managersWithoutObjects[i];
      
      // Найдем менеджера с избытком объектов
      const sourceManager = managersToRedistribute.find(m => m.managedObjects.length > 2);
      
      if (sourceManager && sourceManager.managedObjects.length > 2) {
        // Берем последний объект от менеджера с избытком
        const objectToReassign = sourceManager.managedObjects[sourceManager.managedObjects.length - 1];
        
        // Переназначаем объект
        await prisma.cleaningObject.update({
          where: { id: objectToReassign.id },
          data: { managerId: managerWithoutObjects.id }
        });
        
        console.log(`   ✅ ${objectToReassign.name}`);
        console.log(`      От: ${sourceManager.name}`);
        console.log(`      К: ${managerWithoutObjects.name}`);
        
        // Обновляем локальные данные
        sourceManager.managedObjects.pop();
        redistributionCount++;
      }
    }
    
    // Если все еще есть менеджеры без объектов, создадим новые объекты
    const remainingManagers = managersWithoutObjects.slice(redistributionCount);
    
    if (remainingManagers.length > 0) {
      console.log(`\n🏗️ Создаем новые объекты для оставшихся менеджеров (${remainingManagers.length}):`);
      
      for (let i = 0; i < remainingManagers.length; i++) {
        const manager = remainingManagers[i];
        
        // Создаем новый объект
        const newObject = await prisma.cleaningObject.create({
          data: {
            name: `Тестовый объект для ${manager.name.split(' ')[0]}`,
            address: `Тестовый адрес ${i + 1}`,
            managerId: manager.id,
            isActive: true,
            autoGenerate: true
          }
        });
        
        console.log(`   ✅ Создан: ${newObject.name} для ${manager.name}`);
      }
    }
    
    // Проверим результат
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:');
    
    const finalStats = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        name: true,
        managedObjects: {
          select: { name: true }
        }
      }
    });
    
    const managersWithObjectsCount = finalStats.filter(m => m.managedObjects.length > 0).length;
    const managersWithoutObjectsCount = finalStats.filter(m => m.managedObjects.length === 0).length;
    
    console.log(`   👥 Менеджеров с объектами: ${managersWithObjectsCount}`);
    console.log(`   ❌ Менеджеров без объектов: ${managersWithoutObjectsCount}`);
    
    if (managersWithoutObjectsCount === 0) {
      console.log('\n🎉 ВСЕ МЕНЕДЖЕРЫ ТЕПЕРЬ ИМЕЮТ ОБЪЕКТЫ!');
    }
    
    // Проверим конкретно Шодиеву
    const shodieva = await prisma.user.findFirst({
      where: {
        name: { contains: 'Шодиева' },
        role: 'MANAGER'
      },
      select: {
        name: true,
        managedObjects: {
          select: { name: true }
        }
      }
    });
    
    if (shodieva) {
      console.log(`\n👤 Шодиева теперь имеет объектов: ${shodieva.managedObjects.length}`);
      shodieva.managedObjects.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка назначения:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignObjectsToManagers();
