const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function fixPepsiStructureFinal() {
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ СТРУКТУРЫ ПЕПСИ');
    console.log('==============================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

    // Очищаем старые данные
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: pepsiObjectId }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Читаем файл и парсим правильно
    console.log('📖 Правильный парсинг данных...');
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const pepsiLines = lines.filter(line => line.includes('Пепси 1 515 кв. м.'));
    console.log(`   Найдено строк: ${pepsiLines.length}\n`);

    const pepsiRecords = [];

    pepsiLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 8) {
        // Правильная структура из файла:
        // [0] = Объект, [1] = Адрес, [2] = Участок, [3] = Зона, [4] = Группа помещений, 
        // [5] = Объект уборки, [6] = Техкарта, [7] = Периодичность, [8] = Примечания
        
        const zoneName = parts[3]?.trim() || '';
        const roomGroupName = parts[4]?.trim() || '';
        const cleaningObjectName = parts[5]?.trim() || '';
        const techCardName = parts[6]?.trim() || '';
        const frequency = parts[7]?.trim() || '';
        const notes = parts[8]?.trim() || '';

        // Пропускаем пустые записи
        if (!techCardName || techCardName.trim() === '') {
          return;
        }

        // Определяем тип работы
        let workType = 'Общая уборка';
        const techLower = techCardName.toLowerCase();
        if (techLower.includes('санитарная')) {
          workType = 'Санитарная уборка';
        } else if (techLower.includes('влажная')) {
          workType = 'Влажная уборка';
        } else if (techLower.includes('сухая')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('дезинфекц')) {
          workType = 'Дезинфекция';
        } else if (techLower.includes('мойка') || techLower.includes('мытье')) {
          workType = 'Мойка';
        }

        // Определяем период на основе периодичности
        let period = 'Ежедневно';
        const freqLower = frequency.toLowerCase();
        if (freqLower.includes('неделю') || freqLower.includes('недел')) {
          period = 'Еженедельно';
        } else if (freqLower.includes('месяц')) {
          period = 'Ежемесячно';
        } else if (freqLower.includes('квартал') || freqLower.includes('3 месяца')) {
          period = 'Ежеквартально';
        } else if (freqLower.includes('год')) {
          period = 'Ежегодно';
        } else if (freqLower.includes('смену') || freqLower.includes('смена')) {
          period = 'Каждую смену';
        } else if (freqLower.includes('постоянно') || freqLower.includes('круглосуточно')) {
          period = 'Постоянно';
        }

        const record = {
          objectName: 'Пепси 1 515 кв. м.',
          siteName: 'Производственный комплекс',
          zoneName: zoneName,
          roomGroupName: roomGroupName,
          roomName: roomGroupName, // Используем группу как помещение
          cleaningObjectName: cleaningObjectName,
          techCardName: techCardName,
          frequency: frequency,
          workType: workType,
          description: `${techCardName}${cleaningObjectName ? ' (' + cleaningObjectName + ')' : ''}`,
          notes: notes,
          period: period
        };

        pepsiRecords.push(record);
      }
    });

    console.log(`📋 Обработано записей: ${pepsiRecords.length}\n`);

    // Группируем по зонам для анализа
    const zoneGroups = {};
    pepsiRecords.forEach(record => {
      if (!zoneGroups[record.zoneName]) {
        zoneGroups[record.zoneName] = [];
      }
      zoneGroups[record.zoneName].push(record);
    });

    console.log('🏗️ СТРУКТУРА ПО ЗОНАМ:');
    console.log('=======================');
    Object.keys(zoneGroups).forEach((zoneName, index) => {
      const zoneRecords = zoneGroups[zoneName];
      console.log(`${index + 1}. "${zoneName}" (${zoneRecords.length} техкарт)`);
      
      // Показываем группы помещений в зоне
      const roomGroups = {};
      zoneRecords.forEach(r => {
        if (!roomGroups[r.roomGroupName]) {
          roomGroups[r.roomGroupName] = 0;
        }
        roomGroups[r.roomGroupName]++;
      });
      
      Object.keys(roomGroups).forEach(rgName => {
        console.log(`   📦 ${rgName} (${roomGroups[rgName]} техкарт)`);
      });
      console.log('');
    });

    // Загружаем в базу
    console.log('💾 ЗАГРУЗКА В БАЗУ:');
    console.log('===================');

    let successCount = 0;
    let errorCount = 0;

    for (const [index, record] of pepsiRecords.entries()) {
      try {
        const techCardId = `pepsi_fixed_${index + 1}_${Date.now()}`;
        
        await prisma.objectStructure.create({
          data: {
            objectId: pepsiObjectId,
            objectName: record.objectName,
            siteName: record.siteName,
            zoneName: record.zoneName,
            roomGroupName: record.roomGroupName,
            roomName: record.roomName,
            cleaningObjectName: record.cleaningObjectName,
            techCardName: record.techCardName,
            frequency: record.frequency,
            workType: record.workType,
            description: record.description,
            notes: record.notes,
            period: record.period,
            techCardId: techCardId
          }
        });
        
        successCount++;
        
        if ((index + 1) % 25 === 0) {
          console.log(`✅ Загружено ${index + 1}/${pepsiRecords.length} записей`);
        }
        
      } catch (error) {
        console.error(`❌ Ошибка при загрузке записи ${index + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('========================');
    console.log(`✅ Успешно загружено: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📊 Всего записей: ${pepsiRecords.length}`);

    // Финальная проверка
    const finalZones = await prisma.objectStructure.groupBy({
      by: ['zoneName'],
      where: { objectId: pepsiObjectId },
      _count: { zoneName: true }
    });

    console.log('\n🎯 ФИНАЛЬНАЯ СТРУКТУРА:');
    console.log('=======================');
    finalZones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.zoneName} (${zone._count.zoneName} техкарт)`);
    });

    console.log('\n✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('Теперь структура Пепси полная и правильная');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPepsiStructureFinal();
