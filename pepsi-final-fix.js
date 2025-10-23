const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function pepsiFinalFix() {
  try {
    console.log('🔧 ОКОНЧАТЕЛЬНОЕ ИСПРАВЛЕНИЕ ПЕПСИ');
    console.log('==================================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

    // Очищаем старые данные
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: pepsiObjectId }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Читаем и парсим с правильными индексами
    console.log('📖 Правильный парсинг с корректными индексами...');
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const pepsiLines = lines.filter(line => line.includes('Пепси 1 515 кв. м.'));

    const pepsiRecords = [];

    pepsiLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      // Правильные индексы: [4]=Зона, [5]=Группа, [6]=Объект уборки, [7]=Техкарта, [8]=Периодичность, [9]=Примечания
      if (parts.length >= 8) {
        const objectName = 'Пепси 1 515 кв. м.';
        const siteName = 'Производственный комплекс';
        const zoneName = parts[4]?.trim() || ''; // Зона в индексе 4
        const roomGroupName = parts[5]?.trim() || ''; // Группа помещений в индексе 5
        const cleaningObjectName = parts[6]?.trim() || ''; // Объект уборки в индексе 6
        const techCardName = parts[7]?.trim() || ''; // Техкарта в индексе 7
        const frequency = parts[8]?.trim() || ''; // Периодичность в индексе 8
        const notes = parts[9]?.trim() || ''; // Примечания в индексе 9

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

    // Анализируем структуру по зонам
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

    console.log('🏗️ СТРУКТУРА ПО ЗОНАМ:');
    console.log('=======================');
    Object.keys(zoneGroups).forEach((zoneName, zIndex) => {
      const zoneData = zoneGroups[zoneName];
      const totalTechCards = Object.values(zoneData).reduce((sum, group) => sum + group.length, 0);
      
      console.log(`${zIndex + 1}. ЗОНА: "${zoneName}" (${totalTechCards} техкарт)`);
      
      Object.keys(zoneData).forEach((roomGroupName, rgIndex) => {
        const group = zoneData[roomGroupName];
        console.log(`   📦 "${roomGroupName}" (${group.length} техкарт)`);
        
        // Показываем несколько примеров техкарт
        group.slice(0, 2).forEach((record) => {
          console.log(`      • ${record.cleaningObjectName}: ${record.techCardName} (${record.frequency})`);
        });
        
        if (group.length > 2) {
          console.log(`      ... и еще ${group.length - 2} техкарт`);
        }
      });
      console.log('');
    });

    // Загружаем в базу
    console.log('💾 ЗАГРУЗКА В БАЗУ ДАННЫХ:');
    console.log('==========================');

    let successCount = 0;
    let errorCount = 0;

    for (const [index, record] of pepsiRecords.entries()) {
      try {
        const techCardId = `pepsi_correct_${index + 1}_${Date.now()}`;
        
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
        
        if ((index + 1) % 20 === 0) {
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

    // Финальная проверка структуры в БД
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

    // Проверяем группы помещений
    const roomGroups = await prisma.objectStructure.groupBy({
      by: ['zoneName', 'roomGroupName'],
      where: { objectId: pepsiObjectId },
      _count: { roomGroupName: true }
    });

    console.log('\n📦 ГРУППЫ ПОМЕЩЕНИЙ ПО ЗОНАМ:');
    console.log('=============================');
    const groupedByZone = {};
    roomGroups.forEach(rg => {
      if (!groupedByZone[rg.zoneName]) {
        groupedByZone[rg.zoneName] = [];
      }
      groupedByZone[rg.zoneName].push(rg);
    });

    Object.keys(groupedByZone).forEach(zoneName => {
      console.log(`🏗️ ${zoneName}:`);
      groupedByZone[zoneName].forEach((rg, index) => {
        console.log(`   ${index + 1}. ${rg.roomGroupName} (${rg._count.roomGroupName} техкарт)`);
      });
      console.log('');
    });

    console.log('✅ ОКОНЧАТЕЛЬНОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('🎉 Теперь у вас есть ВСЯ структура Пепси с правильными зонами!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

pepsiFinalFix();
