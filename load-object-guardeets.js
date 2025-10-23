const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadObjectGuardeets() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: ООО ЧОО Гвардеец');
    console.log('===================================\n');

    // Читаем файл и фильтруем строки для Гвардейца
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const guardeetsLines = lines.filter(line => line.includes('ООО ЧОО Гвардеец'));
    console.log(`📋 Найдено строк для Гвардейца: ${guardeetsLines.length}\n`);

    // Анализируем первые строки для понимания структуры
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    guardeetsLines.slice(0, 3).forEach((line, index) => {
      const parts = line.split('\t');
      console.log(`Строка ${index + 1}: ${parts.length} частей`);
      parts.forEach((part, i) => {
        if (part && part.trim()) {
          console.log(`  [${i}]: "${part.trim()}"`);
        }
      });
      console.log('');
    });

    // Создаем или находим объект
    console.log('🏗️ СОЗДАНИЕ/ПОИСК ОБЪЕКТА:');
    const objectName = 'ООО ЧОО Гвардеец';
    const objectAddress = 'Офис охранного предприятия';

    let cleaningObject = await prisma.cleaningObject.findFirst({
      where: { name: objectName }
    });

    if (!cleaningObject) {
      // Находим админа для создания объекта
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!admin) {
        throw new Error('Не найден администратор для создания объекта');
      }

      cleaningObject = await prisma.cleaningObject.create({
        data: {
          name: objectName,
          address: objectAddress,
          description: 'Частное охранное предприятие - офисные помещения',
          creatorId: admin.id
        }
      });
      console.log(`✅ Создан новый объект: ${objectName}`);
    } else {
      console.log(`📍 Найден существующий объект: ${objectName}`);
    }

    console.log(`   ID объекта: ${cleaningObject.id}`);
    console.log(`   Адрес: ${cleaningObject.address}\n`);

    // Очищаем старые данные ObjectStructure для этого объекта
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: cleaningObject.id }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Парсим и загружаем данные
    console.log('📊 ПАРСИНГ И ЗАГРУЗКА ДАННЫХ:');
    const guardeetsRecords = [];

    guardeetsLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 8) {
        const objectName = parts[0]?.trim() || 'ООО ЧОО Гвардеец';
        const address = parts[1]?.trim() || '';
        const siteName = parts[2]?.trim() || 'Офисное здание';
        const zoneName = parts[3]?.trim() || '';
        const roomGroupName = parts[4]?.trim() || '';
        const roomName = parts[5]?.trim() || '';
        const cleaningObjectName = parts[6]?.trim() || '';
        const techCardName = parts[7]?.trim() || '';
        const frequency = parts[8]?.trim() || '';
        const notes = parts[9]?.trim() || '';
        const period = parts[10]?.trim() || '';

        // Пропускаем пустые техкарты
        if (!techCardName || techCardName.trim() === '') {
          return;
        }

        // Исправляем орфографию и убираем лишние символы
        const cleanTechCardName = techCardName
          .replace(/"/g, '') // убираем кавычки
          .replace(/\s+/g, ' ') // убираем лишние пробелы
          .replace('Обеспыливайте', 'Обеспыливание') // исправляем орфографию
          .replace('Помывка', 'Мойка') // исправляем орфографию
          .trim();

        const cleanFrequency = frequency
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const cleanNotes = notes
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Определяем зону и группу помещений из техкарты
        let finalZoneName = 'Офисная зона';
        let finalRoomGroupName = 'Общие помещения';

        const techLower = cleanTechCardName.toLowerCase();
        if (techLower.includes('санузл') || techLower.includes('туалет')) {
          finalZoneName = 'Санитарные помещения';
          finalRoomGroupName = 'Санузлы';
        } else if (techLower.includes('комната приема пищи') || techLower.includes('холодильник') || techLower.includes('свч')) {
          finalZoneName = 'Зона отдыха';
          finalRoomGroupName = 'Комната приема пищи';
        } else if (techLower.includes('окна')) {
          finalZoneName = 'Общие зоны';
          finalRoomGroupName = 'Окна и остекление';
        } else if (techLower.includes('пол') || techLower.includes('мусор') || techLower.includes('стол') || techLower.includes('подоконник')) {
          finalZoneName = 'Рабочие помещения';
          finalRoomGroupName = 'Офисные помещения';
        }

        // Определяем тип работы
        let workType = 'Общая уборка';
        if (techLower.includes('влажная') && techLower.includes('пол')) {
          workType = 'Влажная уборка полов';
        } else if (techLower.includes('мойка') || techLower.includes('помывка')) {
          workType = 'Мойка поверхностей';
        } else if (techLower.includes('мусор') || techLower.includes('отходы')) {
          workType = 'Уборка мусора';
        } else if (techLower.includes('обеспыливание')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('поддержание чистоты')) {
          workType = 'Поддерживающая уборка';
        } else if (techLower.includes('санузл')) {
          workType = 'Санитарная уборка';
        }

        // Определяем период
        let cleanPeriod = 'Ежедневно';
        const freqLower = cleanFrequency.toLowerCase();
        
        if (freqLower.includes('5/2') && freqLower.includes('1раз в день')) {
          cleanPeriod = 'Ежедневно (рабочие дни)';
        } else if (freqLower.includes('1 раз в месяц')) {
          cleanPeriod = 'Ежемесячно';
        } else if (freqLower.includes('2 раза в год')) {
          cleanPeriod = 'Два раза в год';
        } else if (freqLower.includes('по мере необходимости')) {
          cleanPeriod = 'По мере необходимости';
        } else if (freqLower.includes('ежедневно')) {
          cleanPeriod = 'Ежедневно';
        }

        const record = {
          objectName: objectName,
          siteName: siteName || 'Офисное здание',
          zoneName: finalZoneName,
          roomGroupName: finalRoomGroupName,
          roomName: finalRoomGroupName,
          cleaningObjectName: cleaningObjectName,
          techCardName: cleanTechCardName,
          frequency: cleanFrequency,
          workType: workType,
          description: `${cleanTechCardName}${cleaningObjectName ? ' (' + cleaningObjectName + ')' : ''}`,
          notes: cleanNotes,
          period: cleanPeriod
        };

        guardeetsRecords.push(record);
      }
    });

    console.log(`📋 Обработано записей: ${guardeetsRecords.length}\n`);

    // Показываем структуру
    console.log('🏗️ СТРУКТУРА ОБЪЕКТА:');
    console.log('=====================');
    
    const groupedData = {};
    guardeetsRecords.forEach(record => {
      const key = `${record.zoneName} → ${record.roomGroupName}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(record);
    });

    Object.keys(groupedData).forEach((key, index) => {
      const records = groupedData[key];
      console.log(`${index + 1}. ${key} (${records.length} техкарт)`);
      records.forEach((record, rIndex) => {
        console.log(`   ${rIndex + 1}. ${record.techCardName} (${record.period})`);
      });
      console.log('');
    });

    // Загружаем в базу
    console.log('💾 ЗАГРУЗКА В БАЗУ ДАННЫХ:');
    console.log('==========================');

    let successCount = 0;
    let errorCount = 0;

    for (const [index, record] of guardeetsRecords.entries()) {
      try {
        const techCardId = `guardeets_${index + 1}_${Date.now()}`;
        
        await prisma.objectStructure.create({
          data: {
            objectId: cleaningObject.id,
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
        
      } catch (error) {
        console.error(`❌ Ошибка при загрузке записи ${index + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('========================');
    console.log(`✅ Успешно загружено: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📊 Всего записей: ${guardeetsRecords.length}`);

    // Финальная проверка
    const finalCheck = await prisma.objectStructure.findMany({
      where: { objectId: cleaningObject.id },
      select: {
        zoneName: true,
        roomGroupName: true,
        techCardName: true,
        frequency: true,
        workType: true,
        period: true
      }
    });

    console.log('\n🎯 ПРОВЕРКА ЗАГРУЖЕННЫХ ДАННЫХ:');
    console.log('===============================');
    console.log(`Всего записей в БД: ${finalCheck.length}`);
    
    const zoneGroups = {};
    finalCheck.forEach(record => {
      const key = record.zoneName || 'Без зоны';
      if (!zoneGroups[key]) {
        zoneGroups[key] = 0;
      }
      zoneGroups[key]++;
    });

    Object.keys(zoneGroups).forEach((zoneName, index) => {
      console.log(`${index + 1}. "${zoneName}" (${zoneGroups[zoneName]} техкарт)`);
    });

    // Показываем типы работ
    const workTypes = {};
    finalCheck.forEach(record => {
      const workType = record.workType || 'Без типа';
      if (!workTypes[workType]) {
        workTypes[workType] = 0;
      }
      workTypes[workType]++;
    });

    console.log('\n📋 ТИПЫ РАБОТ:');
    Object.keys(workTypes).forEach((workType, index) => {
      console.log(`${index + 1}. ${workType} (${workTypes[workType]} техкарт)`);
    });

    // Показываем периоды
    const periods = {};
    finalCheck.forEach(record => {
      const period = record.period || 'Без периода';
      if (!periods[period]) {
        periods[period] = 0;
      }
      periods[period]++;
    });

    console.log('\n📅 ПЕРИОДЫ ВЫПОЛНЕНИЯ:');
    Object.keys(periods).forEach((period, index) => {
      console.log(`${index + 1}. ${period} (${periods[period]} техкарт)`);
    });

    console.log('\n✅ ЗАГРУЗКА ОБЪЕКТА "ГВАРДЕЕЦ" ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectGuardeets();
