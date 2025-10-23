const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPepsiData() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ДАННЫХ ПЕПСИ');
    console.log('============================\n');

    // 1. Найти и удалить неправильный объект "Пепси 1 515 кв. м."
    console.log('1️⃣ ПОИСК НЕПРАВИЛЬНОГО ОБЪЕКТА:');
    const wrongObject = await prisma.cleaningObject.findFirst({
      where: { 
        name: { 
          contains: 'Пепси 1 515 кв. м.',
          mode: 'insensitive'
        }
      }
    });

    if (wrongObject) {
      console.log(`❌ Найден неправильный объект: ${wrongObject.name} (ID: ${wrongObject.id})`);
      
      // Удаляем связанные данные
      console.log('   Удаление связанных данных...');
      
      await prisma.objectStructure.deleteMany({
        where: { objectId: wrongObject.id }
      });
      
      await prisma.cleaningObject.delete({
        where: { id: wrongObject.id }
      });
      
      console.log('   ✅ Неправильный объект удален');
    } else {
      console.log('❌ Неправильный объект не найден');
    }

    // 2. Найти правильный объект "ООО «ПепсиКо Холдингс»"
    console.log('\n2️⃣ ПОИСК ПРАВИЛЬНОГО ОБЪЕКТА:');
    const correctObject = await prisma.cleaningObject.findFirst({
      where: { 
        name: { 
          contains: 'ПепсиКо Холдингс',
          mode: 'insensitive'
        }
      }
    });

    if (!correctObject) {
      console.log('❌ Правильный объект не найден');
      return;
    }

    console.log(`✅ Найден правильный объект: ${correctObject.name} (ID: ${correctObject.id})`);

    // 3. Очистить старые данные в правильном объекте
    console.log('\n3️⃣ ОЧИСТКА СТАРЫХ ДАННЫХ:');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: correctObject.id }
    });
    
    console.log(`   Удалено записей: ${deletedCount.count}`);

    // 4. Обновить название объекта на правильное
    console.log('\n4️⃣ ОБНОВЛЕНИЕ НАЗВАНИЯ ОБЪЕКТА:');
    await prisma.cleaningObject.update({
      where: { id: correctObject.id },
      data: {
        name: 'Пепси 1 515 кв. м.',
        address: 'г. Самара, ул. Промышленности, 278'
      }
    });
    
    console.log('   ✅ Название объекта обновлено');

    console.log('\n✅ ПОДГОТОВКА ЗАВЕРШЕНА!');
    console.log('Теперь можно загружать правильные данные в объект с ID:', correctObject.id);
    
    return correctObject.id;

  } catch (error) {
    console.error('❌ Ошибка при исправлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPepsiData();
