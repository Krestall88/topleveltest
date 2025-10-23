const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadObjectMedas() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: Медицина АльфаСтрахования МедАС');
    console.log('===============================================\n');

    // Читаем файл и фильтруем строки для МедАС
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const medasLines = lines.filter(line => line.includes('Медицина АльфаСтрахования МедАС'));
    console.log(`📋 Найдено строк для МедАС: ${medasLines.length}\n`);

    // Анализируем первые строки для понимания структуры
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    medasLines.slice(0, 3).forEach((line, index) => {
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
    const objectName = 'Медицина АльфаСтрахования МедАС';
    const objectAddress = 'г. Самара, ул. Мичурина, 46';

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
          description: 'Медицинский центр АльфаСтрахования - медицинские услуги (2,232.6 м²)',
          totalArea: 2232.6,
          creatorId: admin.id
        }
      });
      console.log(`✅ Создан новый объект: ${objectName}`);
    } else {
      console.log(`📍 Найден существующий объект: ${objectName}`);
    }

    console.log(`   ID объекта: ${cleaningObject.id}`);
    console.log(`   Адрес: ${cleaningObject.address}`);
    console.log(`   Площадь: 2,232.6 м²\n`);

    // Очищаем старые данные ObjectStructure для этого объекта
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: cleaningObject.id }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Парсим и загружаем данные
    console.log('📊 ПАРСИНГ И ЗАГРУЗКА ДАННЫХ:');
    const medasRecords = [];

    medasLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 8) {
        const objectName = parts[0]?.trim() || 'Медицина АльфаСтрахования МедАС';
        const address = parts[1]?.trim() || '';
        const siteName = parts[2]?.trim() || 'Медицинский центр';
        const zoneName = parts[3]?.trim() || '';
        const roomGroupName = parts[4]?.trim() || '';
        const roomName = parts[5]?.trim() || '';
        const cleaningObjectName = parts[6]?.trim() || '';
        const techCardName = parts[7]?.trim() || '';
        const frequency = parts[8]?.trim() || '';
        const notes = parts[9]?.trim() || '';

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

        // Определяем зону и группу помещений для медицинского центра
        let finalZoneName = 'Медицинская зона';
        let finalRoomGroupName = 'Общие помещения';

        // Анализируем тип помещения по названию техкарты или объекта уборки
        const techLower = cleanTechCardName.toLowerCase();
        const objLower = cleaningObjectName.toLowerCase();
        
        if (techLower.includes('санузел') || techLower.includes('туалет') || objLower.includes('санузел')) {
          finalZoneName = 'Санитарные узлы';
          finalRoomGroupName = 'Туалеты';
        } else if (techLower.includes('кабинет') || objLower.includes('кабинет')) {
          if (techLower.includes('медицинский') || objLower.includes('медицинский') || 
              techLower.includes('врач') || objLower.includes('врач') ||
              techLower.includes('процедур') || objLower.includes('процедур')) {
            finalZoneName = 'Медицинские кабинеты';
            finalRoomGroupName = 'Кабинеты врачей';
          } else {
            finalZoneName = 'Офисные кабинеты';
            finalRoomGroupName = 'Административные кабинеты';
          }
        } else if (techLower.includes('коридор') || techLower.includes('холл') || 
                   techLower.includes('вход') || objLower.includes('коридор')) {
          finalZoneName = 'Общие зоны';
          finalRoomGroupName = 'Коридоры и холлы';
        } else if (techLower.includes('комната приема пищи') || techLower.includes('кухня') ||
                   objLower.includes('приема пищи')) {
          finalZoneName = 'Зона отдыха';
          finalRoomGroupName = 'Комната приема пищи';
        } else if (techLower.includes('генеральная') || techLower.includes('окна') ||
                   techLower.includes('светильник') || techLower.includes('дезинфекция')) {
          finalZoneName = 'Генеральная уборка';
          finalRoomGroupName = 'Весь медцентр';
        }

        // Определяем тип работы с учетом медицинской специфики
        let workType = 'Общая уборка';
        
        if (techLower.includes('дезинфекц')) {
          workType = 'Дезинфекция';
        } else if (techLower.includes('влажная') && techLower.includes('пол')) {
          workType = 'Влажная уборка полов';
        } else if (techLower.includes('влажная')) {
          workType = 'Влажная уборка';
        } else if (techLower.includes('сухая')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('генеральная')) {
          workType = 'Генеральная уборка';
        } else if (techLower.includes('вынос мусора')) {
          workType = 'Уборка мусора';
        } else if (techLower.includes('мытье') || techLower.includes('мойка')) {
          workType = 'Мойка поверхностей';
        } else if (techLower.includes('окна')) {
          workType = 'Мойка окон';
        } else if (techLower.includes('светильник')) {
          workType = 'Уборка светильников';
        } else if (techLower.includes('комплектация')) {
          workType = 'Комплектация расходными материалами';
        }

        // Определяем период выполнения
        let cleanPeriod = 'Ежедневно';
        const freqLower = cleanFrequency.toLowerCase();
        
        if (freqLower.includes('ежедневно') || freqLower.includes('1 раз в день') || 
            freqLower.includes('1раз в день') || freqLower.includes('2 раза в день')) {
          cleanPeriod = 'Ежедневно';
        } else if (freqLower.includes('2 раза в день')) {
          cleanPeriod = 'Два раза в день';
        } else if (freqLower.includes('каждые 2 часа') || freqLower.includes('почасово')) {
          cleanPeriod = 'Почасово';
        } else if (freqLower.includes('1 раз в неделю') || freqLower.includes('еженедельно')) {
          cleanPeriod = 'Еженедельно';
        } else if (freqLower.includes('1 раз в месяц') || freqLower.includes('ежемесячно')) {
          cleanPeriod = 'Ежемесячно';
        } else if (freqLower.includes('1 раз в квартал') || freqLower.includes('ежеквартально')) {
          cleanPeriod = 'Ежеквартально';
        } else if (freqLower.includes('по мере необходимости')) {
          cleanPeriod = 'По мере необходимости';
        }

        const record = {
          objectName: objectName.replace('2232,6 м2', '').trim(), // убираем площадь из названия
          siteName: siteName || 'Медицинский центр',
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

        medasRecords.push(record);
      }
    });

    console.log(`📋 Обработано записей: ${medasRecords.length}\n`);

    // Показываем структуру
    console.log('🏗️ СТРУКТУРА ОБЪЕКТА:');
    console.log('=====================');
    
    const groupedData = {};
    medasRecords.forEach(record => {
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
        console.log(`   ${rIndex + 1}. ${record.techCardName} (${record.period})`);
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

    for (const [index, record] of medasRecords.entries()) {
      try {
        const techCardId = `medas_${index + 1}_${Date.now()}`;
        
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
        
        if ((index + 1) % 10 === 0) {
          console.log(`✅ Загружено ${index + 1}/${medasRecords.length} записей`);
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
    console.log(`📊 Всего записей: ${medasRecords.length}`);

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

    console.log('\n✅ ЗАГРУЗКА ОБЪЕКТА "МЕДАС" ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectMedas();
