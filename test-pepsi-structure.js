const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPepsiStructure() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ СТРУКТУРЫ ПЕПСИ');
    console.log('===============================\n');

    // Получаем объект Пепси
    const pepsiObject = await prisma.cleaningObject.findFirst({
      where: { name: { contains: 'Пепси' } }
    });

    if (!pepsiObject) {
      console.log('❌ Объект Пепси не найден');
      return;
    }

    console.log(`🏢 Объект: ${pepsiObject.name}`);
    console.log(`   ID: ${pepsiObject.id}\n`);

    // Получаем данные из плоской таблицы
    const records = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObject.id },
      orderBy: [
        { siteName: 'asc' },
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' },
        { cleaningObjectName: 'asc' },
        { techCardName: 'asc' }
      ]
    });

    console.log(`📊 Всего записей: ${records.length}\n`);

    // Группируем по зонам для анализа
    const zoneGroups = {};
    records.forEach(record => {
      const zoneKey = record.zoneName || 'Без зоны';
      if (!zoneGroups[zoneKey]) {
        zoneGroups[zoneKey] = {};
      }
      
      const roomGroupKey = record.roomGroupName || 'Без группы';
      if (!zoneGroups[zoneKey][roomGroupKey]) {
        zoneGroups[zoneKey][roomGroupKey] = {};
      }
      
      const roomKey = record.roomName || 'Без помещения';
      if (!zoneGroups[zoneKey][roomGroupKey][roomKey]) {
        zoneGroups[zoneKey][roomGroupKey][roomKey] = [];
      }
      
      zoneGroups[zoneKey][roomGroupKey][roomKey].push({
        techCard: record.techCardName,
        frequency: record.frequency,
        cleaningObject: record.cleaningObjectName,
        notes: record.notes,
        period: record.period
      });
    });

    console.log('🏗️ СТРУКТУРА ПО ЗОНАМ:');
    console.log('======================');

    Object.entries(zoneGroups).forEach(([zoneName, roomGroups]) => {
      console.log(`\n📍 ${zoneName}`);
      
      Object.entries(roomGroups).forEach(([roomGroupName, rooms]) => {
        console.log(`  📦 ${roomGroupName}`);
        
        Object.entries(rooms).forEach(([roomName, techCards]) => {
          console.log(`    🏠 ${roomName} (${techCards.length} техзаданий)`);
          
          // Группируем по объектам уборки
          const cleaningObjects = {};
          techCards.forEach(tc => {
            const coKey = tc.cleaningObject || 'Общие работы';
            if (!cleaningObjects[coKey]) {
              cleaningObjects[coKey] = [];
            }
            cleaningObjects[coKey].push(tc);
          });
          
          Object.entries(cleaningObjects).forEach(([coName, tasks]) => {
            if (tasks.length > 1) {
              console.log(`      📋 ${coName} (${tasks.length} техзаданий)`);
              tasks.slice(0, 2).forEach(task => {
                console.log(`        🔧 ${task.techCard} [${task.frequency}]`);
              });
              if (tasks.length > 2) {
                console.log(`        ... и еще ${tasks.length - 2} техзаданий`);
              }
            } else {
              console.log(`      🔧 ${tasks[0].techCard} [${tasks[0].frequency}]`);
            }
          });
        });
      });
    });

    // Ищем конкретно "Зона 7. Склад сырья и готовой продукции"
    console.log('\n🎯 ПОИСК ЗОНЫ 7 (СКЛАД):');
    console.log('========================');
    
    const zone7Records = records.filter(r => 
      r.zoneName && r.zoneName.includes('Склад сырья')
    );
    
    if (zone7Records.length > 0) {
      console.log(`Найдено записей в Зоне 7: ${zone7Records.length}`);
      
      const zone7Groups = {};
      zone7Records.forEach(record => {
        const roomKey = record.roomName || 'Без помещения';
        if (!zone7Groups[roomKey]) {
          zone7Groups[roomKey] = [];
        }
        zone7Groups[roomKey].push({
          techCard: record.techCardName,
          frequency: record.frequency,
          cleaningObject: record.cleaningObjectName
        });
      });
      
      console.log('\nПомещения в Зоне 7:');
      Object.entries(zone7Groups).forEach(([roomName, tasks]) => {
        console.log(`  🏠 ${roomName} (${tasks.length} техзаданий)`);
        if (tasks[0].cleaningObject) {
          console.log(`    📋 Есть объекты уборки`);
        } else {
          console.log(`    ❌ Нет объектов уборки - техзадания напрямую`);
        }
      });
    } else {
      console.log('❌ Зона 7 не найдена');
    }

    console.log('\n✅ Анализ завершен!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPepsiStructure();
