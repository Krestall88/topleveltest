const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixZheldorproektDuplicate() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ ОБЪЕКТА «Желдорпроект Поволжья»');
    console.log('===========================================================\n');

    // Ищем все объекты, связанные с Желдорпроект
    const zheldorObjects = await prisma.cleaningObject.findMany({
      where: {
        OR: [
          { name: { contains: 'Желдорпроект' } },
          { name: { contains: 'Росжелдорпроект' } }
        ]
      },
      include: {
        _count: {
          select: {
            objectStructures: true
          }
        }
      }
    });

    console.log('🔍 НАЙДЕННЫЕ ОБЪЕКТЫ:');
    console.log('=====================');
    zheldorObjects.forEach((obj, index) => {
      console.log(`${index + 1}. "${obj.name}"`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Адрес: ${obj.address}`);
      console.log(`   Техкарт: ${obj._count.objectStructures}`);
      console.log(`   Создан: ${obj.createdAt.toISOString().split('T')[0]}`);
      console.log('');
    });

    if (zheldorObjects.length < 2) {
      console.log('⚠️ Дублирование не найдено. Объектов меньше 2.');
      return;
    }

    // Определяем правильное название объекта
    const correctName = '«Желдорпроект Поволжья» - филиала АО «Росжелдорпроект» 1302,5 кв. м';
    const correctAddress = 'ул. Красноармейская, 137б';

    // Находим объект, который нужно оставить (с большим количеством техкарт или более новый)
    let mainObject = zheldorObjects[0];
    let duplicateObjects = [];

    for (let i = 1; i < zheldorObjects.length; i++) {
      const obj = zheldorObjects[i];
      if (obj._count.objectStructures > mainObject._count.objectStructures) {
        duplicateObjects.push(mainObject);
        mainObject = obj;
      } else {
        duplicateObjects.push(obj);
      }
    }

    console.log('📋 ПЛАН ИСПРАВЛЕНИЯ:');
    console.log('====================');
    console.log(`✅ Основной объект: "${mainObject.name}" (${mainObject._count.objectStructures} техкарт)`);
    console.log(`🗑️ Объекты для удаления: ${duplicateObjects.length}`);
    duplicateObjects.forEach((obj, index) => {
      console.log(`   ${index + 1}. "${obj.name}" (${obj._count.objectStructures} техкарт)`);
    });
    console.log('');

    // Переносим техкарты из дублирующих объектов в основной
    console.log('🔄 ПЕРЕНОС ТЕХКАРТ:');
    console.log('==================');
    
    let totalTransferred = 0;
    for (const dupObj of duplicateObjects) {
      if (dupObj._count.objectStructures > 0) {
        console.log(`📦 Переносим ${dupObj._count.objectStructures} техкарт из "${dupObj.name}"`);
        
        const updateResult = await prisma.objectStructure.updateMany({
          where: { objectId: dupObj.id },
          data: { objectId: mainObject.id }
        });
        
        console.log(`   ✅ Перенесено: ${updateResult.count} техкарт`);
        totalTransferred += updateResult.count;
      }
    }

    console.log(`📊 Всего перенесено техкарт: ${totalTransferred}\n`);

    // Обновляем название и адрес основного объекта
    console.log('📝 ОБНОВЛЕНИЕ ОСНОВНОГО ОБЪЕКТА:');
    console.log('===============================');
    
    const updatedMainObject = await prisma.cleaningObject.update({
      where: { id: mainObject.id },
      data: {
        name: correctName,
        address: correctAddress,
        description: '«Желдорпроект Поволжья» - филиала АО «Росжелдорпроект» - проектный институт'
      }
    });

    console.log(`✅ Обновлен объект:`);
    console.log(`   Название: ${updatedMainObject.name}`);
    console.log(`   Адрес: ${updatedMainObject.address}`);
    console.log('');

    // Удаляем дублирующие объекты
    console.log('🗑️ УДАЛЕНИЕ ДУБЛИРУЮЩИХ ОБЪЕКТОВ:');
    console.log('=================================');
    
    for (const dupObj of duplicateObjects) {
      console.log(`🗑️ Удаляем объект: "${dupObj.name}"`);
      
      await prisma.cleaningObject.delete({
        where: { id: dupObj.id }
      });
      
      console.log(`   ✅ Удален объект ID: ${dupObj.id}`);
    }

    console.log('');

    // Проверяем итоговое состояние
    console.log('🎯 ИТОГОВАЯ ПРОВЕРКА:');
    console.log('=====================');
    
    const finalObject = await prisma.cleaningObject.findUnique({
      where: { id: mainObject.id },
      include: {
        _count: {
          select: {
            objectStructures: true
          }
        }
      }
    });

    console.log(`✅ Итоговый объект:`);
    console.log(`   Название: ${finalObject.name}`);
    console.log(`   ID: ${finalObject.id}`);
    console.log(`   Адрес: ${finalObject.address}`);
    console.log(`   Техкарт: ${finalObject._count.objectStructures}`);
    console.log('');

    // Проверяем, что дублирующих объектов больше нет
    const remainingZheldor = await prisma.cleaningObject.findMany({
      where: {
        OR: [
          { name: { contains: 'Желдорпроект' } },
          { name: { contains: 'Росжелдорпроект' } }
        ]
      }
    });

    console.log(`🔍 Проверка дублирования: найдено ${remainingZheldor.length} объект(ов)`);
    if (remainingZheldor.length === 1) {
      console.log('✅ Дублирование успешно устранено!');
    } else {
      console.log('⚠️ Внимание: найдено больше одного объекта');
      remainingZheldor.forEach((obj, index) => {
        console.log(`   ${index + 1}. "${obj.name}" (ID: ${obj.id})`);
      });
    }

    console.log('\n✅ ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ ЗАВЕРШЕНО!');
    console.log(`🏢 Объект: ${correctName}`);
    console.log(`📋 Итоговое количество техкарт: ${finalObject._count.objectStructures}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixZheldorproektDuplicate();
