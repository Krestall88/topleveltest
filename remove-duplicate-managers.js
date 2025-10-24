const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeDuplicateManagers() {
  console.log('🔄 Переносим назначения с @temp.com на оригинальные аккаунты...\n');

  try {
    // Найдем всех менеджеров с @temp.com
    const tempManagers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        email: {
          endsWith: '@temp.com'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        managedObjects: {
          select: { id: true, name: true }
        },
        managedSites: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`📊 Найдено менеджеров с @temp.com: ${tempManagers.length}\n`);

    let transferredCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const tempManager of tempManagers) {
      console.log(`🔍 Проверяем: ${tempManager.name} (${tempManager.email})`);
      
      // Ищем оригинального менеджера с таким же именем
      let originalManager = await prisma.user.findFirst({
        where: {
          role: 'MANAGER',
          name: tempManager.name,
          email: {
            endsWith: '@cleaning.com'
          }
        }
      });

      // Специальная обработка для менеджеров с разными вариантами имен
      if (!originalManager) {
        let searchName = null;
        
        if (tempManager.name.includes('Шодиева Мухарам')) {
          searchName = 'Шодиева Мухарам';
        }
        // Можно добавить другие случаи при необходимости
        
        if (searchName) {
          originalManager = await prisma.user.findFirst({
            where: {
              role: 'MANAGER',
              name: {
                contains: searchName,
                mode: 'insensitive'
              },
              email: {
                endsWith: '@cleaning.com'
              }
            }
          });
          if (originalManager) {
            console.log(`🔍 Найдено по частичному совпадению: "${originalManager.name}"`);
          }
        }
      }

      if (originalManager) {
        console.log(`👤 Найден оригинал: ${originalManager.email}`);
        
        // Проверяем, есть ли у временного менеджера назначения
        const hasAssignments = tempManager.managedObjects.length > 0 || tempManager.managedSites.length > 0;
        
        // Специальная логика для Шодиевой: переносим назначения НА временный аккаунт (у него полное имя)
        const isShodoeva = tempManager.name.includes('Шодиева Мухарам') && originalManager.name.includes('Шодиева Мухарам');
        
        if (hasAssignments) {
          console.log(`🔄 ПЕРЕНОСИМ назначения: ${tempManager.managedObjects.length} объектов, ${tempManager.managedSites.length} участков`);
          
          // Переносим объекты
          if (tempManager.managedObjects.length > 0) {
            await prisma.cleaningObject.updateMany({
              where: { managerId: tempManager.id },
              data: { managerId: originalManager.id }
            });
            console.log(`   ✅ Перенесено ${tempManager.managedObjects.length} объектов`);
          }
          
          // Переносим участки
          if (tempManager.managedSites.length > 0) {
            await prisma.site.updateMany({
              where: { managerId: tempManager.id },
              data: { managerId: originalManager.id }
            });
            console.log(`   ✅ Перенесено ${tempManager.managedSites.length} участков`);
          }
          
          transferredCount++;
        } else if (isShodoeva) {
          // Для Шодиевой: переносим назначения С оригинального НА временный (у временного полное имя)
          const originalAssignments = await prisma.cleaningObject.count({
            where: { managerId: originalManager.id }
          }) + await prisma.site.count({
            where: { managerId: originalManager.id }
          });
          
          if (originalAssignments > 0) {
            console.log(`🔄 СПЕЦИАЛЬНЫЙ СЛУЧАЙ: переносим назначения С "${originalManager.name}" НА "${tempManager.name}"`);
            
            // Переносим объекты с оригинального на временный
            await prisma.cleaningObject.updateMany({
              where: { managerId: originalManager.id },
              data: { managerId: tempManager.id }
            });
            
            // Переносим участки с оригинального на временный
            await prisma.site.updateMany({
              where: { managerId: originalManager.id },
              data: { managerId: tempManager.id }
            });
            
            console.log(`   ✅ Перенесены назначения на аккаунт с полным именем`);
            transferredCount++;
          }
        }
        
        // Определяем, какой аккаунт удалять
        let accountToDelete, accountToKeep;
        
        if (isShodoeva) {
          // Для Шодиевой: удаляем короткое имя, оставляем полное
          accountToDelete = originalManager;
          accountToKeep = tempManager;
          console.log(`🔄 СПЕЦИАЛЬНЫЙ СЛУЧАЙ: оставляем "${tempManager.name}" с полным именем`);
        } else {
          // Обычный случай: удаляем временный, оставляем оригинальный
          accountToDelete = tempManager;
          accountToKeep = originalManager;
        }
        
        // Обновляем email у оставляемого аккаунта на правильный
        if (isShodoeva) {
          await prisma.user.update({
            where: { id: accountToKeep.id },
            data: { 
              email: originalManager.email // Берем правильный email от оригинального
            }
          });
          console.log(`✅ Обновлен email на: ${originalManager.email}`);
        }
        
        // Удаляем ненужный аккаунт
        await prisma.user.delete({
          where: { id: accountToDelete.id }
        });
        console.log(`🗑️ УДАЛЕН аккаунт: ${accountToDelete.email}`);
        deletedCount++;
        
      } else {
        console.log(`⚠️ ПРОПУСКАЕМ: не найден оригинальный менеджер с @cleaning.com`);
        skippedCount++;
      }
      console.log('');
    }

    console.log('📈 ИТОГИ:');
    console.log(`🔄 Перенесено назначений: ${transferredCount}`);
    console.log(`✅ Удалено дублей: ${deletedCount}`);
    console.log(`⚠️ Пропущено: ${skippedCount}`);
    console.log(`📊 Всего обработано: ${tempManagers.length}`);

    // Покажем итоговое количество менеджеров
    const finalCount = await prisma.user.count({
      where: { role: 'MANAGER' }
    });
    console.log(`\n👥 Итого менеджеров в системе: ${finalCount}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicateManagers();
