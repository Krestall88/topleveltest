const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadObjectAmond() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: ООО «УК «Амонд-ЖилКомСервис»');
    console.log('=================================================\n');

    // Читаем файл и фильтруем строки для Амонд
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const amondLines = lines.filter(line => line.includes('Амонд-ЖилКомСервис'));
    console.log(`📋 Найдено строк для Амонд: ${amondLines.length}\n`);

    // Анализируем первые строки для понимания структуры
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    amondLines.slice(0, 3).forEach((line, index) => {
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
    const objectName = 'ООО «УК «Амонд-ЖилКомСервис»';
    const objectAddress = 'Жилой комплекс под управлением УК Амонд';

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
          description: 'Управляющая компания - уборка жилых комплексов',
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
    const amondRecords = [];

    amondLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 8) {
        const objectName = parts[0]?.trim() || 'ООО «УК «Амонд-ЖилКомСервис»';
        const address = parts[1]?.trim() || '';
        const siteName = parts[2]?.trim() || 'Жилой комплекс';
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
          .trim();

        const cleanFrequency = frequency
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const cleanNotes = notes
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Определяем зону и группу помещений из cleaningObjectName
        let finalZoneName = 'Жилой комплекс';
        let finalRoomGroupName = 'Общие зоны';

        const cleaningObjLower = cleaningObjectName.toLowerCase();
        if (cleaningObjLower.includes('места общего пользования')) {
          finalZoneName = 'Места общего пользования';
          finalRoomGroupName = 'Внутренние помещения';
        } else if (cleaningObjLower.includes('придомовая') || cleaningObjLower.includes('территория')) {
          finalZoneName = 'Придомовая территория';
          finalRoomGroupName = 'Внешняя территория';
        }

        // Определяем тип работы
        let workType = 'Общая уборка';
        const techLower = cleanTechCardName.toLowerCase();
        if (techLower.includes('мытье') || techLower.includes('мойка')) {
          workType = 'Влажная уборка';
        } else if (techLower.includes('подметание')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('уборка мусора') || techLower.includes('очистка от мусора')) {
          workType = 'Уборка мусора';
        } else if (techLower.includes('газон') || techLower.includes('полив') || techLower.includes('выкашивание')) {
          workType = 'Уход за территорией';
        } else if (techLower.includes('снег') || techLower.includes('лед') || techLower.includes('наледи') || techLower.includes('посыпка')) {
          workType = 'Зимние работы';
        } else if (techLower.includes('контейнер') || techLower.includes('урн')) {
          workType = 'Уборка мусорных зон';
        }

        // Определяем период
        let cleanPeriod = 'Ежедневно';
        const freqLower = cleanFrequency.toLowerCase();
        const notesLower = cleanNotes.toLowerCase();
        
        if (freqLower.includes('раз в месяц')) {
          cleanPeriod = 'Ежемесячно';
        } else if (freqLower.includes('раз в неделю')) {
          cleanPeriod = 'Еженедельно';
        } else if (freqLower.includes('раз в двое суток')) {
          cleanPeriod = 'Через день';
        } else if (freqLower.includes('раз в сутки')) {
          cleanPeriod = 'Ежедневно';
        } else if (freqLower.includes('по мере необходимости')) {
          cleanPeriod = 'По мере необходимости';
        } else if (freqLower.includes('во время гололеда')) {
          cleanPeriod = 'При гололеде';
        } else if (freqLower.includes('раз в 3 суток')) {
          cleanPeriod = 'Раз в 3 дня';
        }

        // Уточняем период по примечаниям
        if (notesLower.includes('теплый период')) {
          cleanPeriod += ' (летний период)';
        } else if (notesLower.includes('холодный период')) {
          cleanPeriod += ' (зимний период)';
        }

        const record = {
          objectName: objectName,
          siteName: siteName || 'Жилой комплекс',
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

        amondRecords.push(record);
      }
    });

    console.log(`📋 Обработано записей: ${amondRecords.length}\n`);

    // Показываем структуру
    console.log('🏗️ СТРУКТУРА ОБЪЕКТА:');
    console.log('=====================');
    
    const groupedData = {};
    amondRecords.forEach(record => {
      const key = `${record.zoneName} → ${record.roomGroupName}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(record);
    });

    Object.keys(groupedData).forEach((key, index) => {
      const records = groupedData[key];
      console.log(`${index + 1}. ${key} (${records.length} техкарт)`);
      records.slice(0, 5).forEach((record, rIndex) => {
        console.log(`   ${rIndex + 1}. ${record.techCardName} (${record.frequency}) - ${record.period}`);
      });
      if (records.length > 5) {
        console.log(`   ... и еще ${records.length - 5} техкарт`);
      }
      console.log('');
    });

    // Загружаем в базу
    console.log('💾 ЗАГРУЗКА В БАЗУ ДАННЫХ:');
    console.log('==========================');

    let successCount = 0;
    let errorCount = 0;

    for (const [index, record] of amondRecords.entries()) {
      try {
        const techCardId = `amond_${index + 1}_${Date.now()}`;
        
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
        
        if ((index + 1) % 5 === 0) {
          console.log(`✅ Загружено ${index + 1}/${amondRecords.length} записей`);
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
    console.log(`📊 Всего записей: ${amondRecords.length}`);

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

    console.log('\n✅ ЗАГРУЗКА ОБЪЕКТА "АМОНД" ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectAmond();
