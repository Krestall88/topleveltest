const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function finalPepsiCorrect() {
  try {
    console.log('🎯 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ПЕПСИ');
    console.log('==============================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

    // Очищаем старые данные
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: pepsiObjectId }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Читаем и парсим правильно
    console.log('📖 Анализ структуры данных...');
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const pepsiLines = lines.filter(line => line.includes('Пепси 1 515 кв. м.'));
    
    // Анализируем первые несколько строк
    console.log('🔍 Анализ первых строк:');
    pepsiLines.slice(0, 3).forEach((line, index) => {
      const parts = line.split('\t');
      console.log(`Строка ${index + 1}: ${parts.length} частей`);
      parts.forEach((part, i) => {
        console.log(`  [${i}]: "${part}"`);
      });
      console.log('');
    });

    const pepsiRecords = [];

    pepsiLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      // Структура: [0]=Объект, [1]=Адрес, [2]=Участок, [3]=Зона, [4]=Группа, [5]=Объект уборки, [6]=Техкарта, [7]=Периодичность, [8]=Примечания
      if (parts.length >= 7) {
        const objectName = parts[0]?.trim() || 'Пепси 1 515 кв. м.';
        const siteName = 'Производственный комплекс';
        const zoneName = parts[3]?.trim() || '';
        const roomGroupName = parts[4]?.trim() || '';
        const cleaningObjectName = parts[5]?.trim() || '';
        const techCardName = parts[6]?.trim() || '';
        const frequency = parts[7]?.trim() || '';
        const notes = parts[8]?.trim() || '';

        // Пропускаем пустые техкарты
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

        // Определяем период
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
          objectName: objectName,
          siteName: siteName,
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

    // Анализируем структуру
    const zoneGroups = {};
    pepsiRecords.forEach(record => {
      const zoneName = record.zoneName || 'Без зоны';
      if (!zoneGroups[zoneName]) {
        zoneGroups[zoneName] = {};
      }
      
      const roomGroupName = record.roomGroupName || 'Без группы';
      if (!zoneGroups[zoneName][roomGroupName]) {
        zoneGroups[zoneName][roomGroupName] = [];
      }
      
      zoneGroups[zoneName][roomGroupName].push(record);
    });

    console.log('🏗️ АНАЛИЗ СТРУКТУРЫ:');
    console.log('====================');
    Object.keys(zoneGroups).forEach((zoneName, zIndex) => {
      const zoneData = zoneGroups[zoneName];
      const totalTechCards = Object.values(zoneData).reduce((sum, group) => sum + group.length, 0);
      
      console.log(`${zIndex + 1}. ЗОНА: "${zoneName}" (${totalTechCards} техкарт)`);
      
      Object.keys(zoneData).forEach((roomGroupName, rgIndex) => {
        const group = zoneData[roomGroupName];
        console.log(`   ${rgIndex + 1}. Группа: "${roomGroupName}" (${group.length} техкарт)`);
        
        // Показываем первые 3 техкарты
        group.slice(0, 3).forEach((record, tIndex) => {
          console.log(`      - ${record.cleaningObjectName}: ${record.techCardName}`);
        });
        
        if (group.length > 3) {
          console.log(`      ... и еще ${group.length - 3} техкарт`);
        }
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
        const techCardId = `pepsi_final_${index + 1}_${Date.now()}`;
        
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

    console.log('\n🎯 ФИНАЛЬНАЯ СТРУКТУРА В БД:');
    console.log('============================');
    finalZones.forEach((zone, index) => {
      console.log(`${index + 1}. "${zone.zoneName}" (${zone._count.zoneName} техкарт)`);
    });

    console.log('\n✅ ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('Теперь у вас есть ВСЕ данные по Пепси из context_1.md');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalPepsiCorrect();
