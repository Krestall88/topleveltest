const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllYugServis() {
  try {
    console.log('🔍 ПРОВЕРКА ВСЕХ ОБЪЕКТОВ УК ЮГ-СЕРВИС');
    console.log('======================================\n');

    // Находим все объекты УК Юг-сервис
    const yugServisObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      include: {
        manager: { select: { name: true } },
        _count: {
          select: {
            sites: true,
            rooms: true,
            techCards: true,
            checklists: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 Найдено объектов УК Юг-сервис: ${yugServisObjects.length}\n`);

    yugServisObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   🆔 ID: ${obj.id}`);
      console.log(`   📅 Создан: ${obj.createdAt.toLocaleString('ru-RU')}`);
      console.log(`   👤 Менеджер: ${obj.manager?.name || 'не назначен'}`);
      console.log(`   🗺️ Участков: ${obj._count.sites}`);
      console.log(`   🚪 Помещений: ${obj._count.rooms}`);
      console.log(`   🔧 Техкарт: ${obj._count.techCards}`);
      console.log(`   📋 Чек-листов: ${obj._count.checklists}`);
      
      // Определяем тип структуры
      if (obj._count.sites > 0 && obj._count.rooms > 0) {
        console.log(`   📊 Тип: МНОГОУРОВНЕВАЯ СТРУКТУРА`);
      } else if (obj._count.sites > 0) {
        console.log(`   📊 Тип: ТОЛЬКО УЧАСТКИ`);
      } else if (obj._count.rooms > 0) {
        console.log(`   📊 Тип: ТОЛЬКО ПОМЕЩЕНИЯ`);
      } else {
        console.log(`   📊 Тип: ПУСТОЙ`);
      }
      
      console.log('');
    });

    // Анализируем дубли
    if (yugServisObjects.length > 1) {
      console.log('⚠️ ОБНАРУЖЕНЫ ДУБЛИ!');
      console.log('='.repeat(20));
      
      // Находим объект с лучшей структурой
      const bestObject = yugServisObjects.reduce((best, current) => {
        const bestScore = (best._count.sites > 0 ? 100 : 0) + 
                         (best._count.rooms > 0 ? 50 : 0) + 
                         (best._count.techCards * 1);
        const currentScore = (current._count.sites > 0 ? 100 : 0) + 
                            (current._count.rooms > 0 ? 50 : 0) + 
                            (current._count.techCards * 1);
        return currentScore > bestScore ? current : best;
      });

      console.log(`✅ ЛУЧШИЙ ОБЪЕКТ: ${bestObject.name}`);
      console.log(`   ID: ${bestObject.id}`);
      console.log(`   Причина: наиболее полная структура\n`);

      const objectsToRemove = yugServisObjects.filter(obj => obj.id !== bestObject.id);
      
      console.log('🗑️ ОБЪЕКТЫ ДЛЯ УДАЛЕНИЯ:');
      objectsToRemove.forEach((obj, index) => {
        console.log(`${index + 1}. ${obj.name} (ID: ${obj.id})`);
        console.log(`   Причина: дубль, менее полная структура`);
      });

      return { bestObject, objectsToRemove };
    } else {
      console.log('✅ Дублей не обнаружено');
      return { bestObject: yugServisObjects[0], objectsToRemove: [] };
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllYugServis();
