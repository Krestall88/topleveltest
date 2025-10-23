const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadObjectYugService() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: ООО «Юг-Сервис»');
    console.log('==================================\n');

    // Читаем файл и фильтруем строки для Юг-Сервис
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const yugServiceLines = lines.filter(line => line.includes('Юг-Сервис'));
    console.log(`📋 Найдено строк для Юг-Сервис: ${yugServiceLines.length}\n`);

    // Анализируем первые строки для понимания структуры
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    yugServiceLines.slice(0, 3).forEach((line, index) => {
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
    const objectName = 'ООО «Юг-Сервис»';
    const objectAddress = 'г. Самара, сервисная компания';

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
          description: 'ООО «Юг-Сервис» - сервисная компания',
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
    const yugServiceRecords = [];

    yugServiceLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 8) {
        const objectName = parts[0]?.trim() || 'ООО «Юг-Сервис»';
        const address = parts[1]?.trim() || '';
        const siteName = parts[2]?.trim() || 'Сервисная компания';
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

        // Определяем зону и группу помещений для сервисной компании
        let finalZoneName = zoneName || 'Офисная зона';
        let finalRoomGroupName = roomGroupName || cleaningObjectName || 'Общие помещения';

        // Очищаем названия зон от лишних символов
        finalZoneName = finalZoneName
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        finalRoomGroupName = finalRoomGroupName
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Анализируем тип помещения по названию для сервисной компании
        const techLower = cleanTechCardName.toLowerCase();
        const objLower = cleaningObjectName.toLowerCase();
        
        if (objLower.includes('офис') || techLower.includes('офис') ||
            objLower.includes('кабинет') || techLower.includes('кабинет')) {
          finalZoneName = 'Офисная зона';
          finalRoomGroupName = 'Офисы и кабинеты';
        } else if (objLower.includes('переговорная') || techLower.includes('переговорная') ||
                   objLower.includes('конференц') || techLower.includes('конференц')) {
          finalZoneName = 'Переговорные зоны';
          finalRoomGroupName = 'Переговорные комнаты';
        } else if (objLower.includes('склад') || techLower.includes('склад') ||
                   objLower.includes('хранение') || techLower.includes('хранение')) {
          finalZoneName = 'Складская зона';
          finalRoomGroupName = 'Склады';
        } else if (objLower.includes('мастерская') || techLower.includes('мастерская') ||
                   objLower.includes('сервис') || techLower.includes('сервис') ||
                   objLower.includes('ремонт') || techLower.includes('ремонт')) {
          finalZoneName = 'Сервисная зона';
          finalRoomGroupName = 'Мастерские и сервис';
        } else if (objLower.includes('санузел') || techLower.includes('санузел') ||
                   objLower.includes('туалет') || techLower.includes('туалет')) {
          finalZoneName = 'Санитарные помещения';
          finalRoomGroupName = 'Туалеты';
        } else if (objLower.includes('коридор') || techLower.includes('коридор') ||
                   objLower.includes('холл') || techLower.includes('холл') ||
                   objLower.includes('вестибюль') || techLower.includes('вестибюль')) {
          finalZoneName = 'Общие зоны';
          finalRoomGroupName = 'Коридоры и холлы';
        } else if (objLower.includes('лестниц') || techLower.includes('лестниц')) {
          finalZoneName = 'Лестничные клетки';
          finalRoomGroupName = 'Лестницы';
        } else if (objLower.includes('столовая') || techLower.includes('столовая') ||
                   objLower.includes('буфет') || techLower.includes('буфет') ||
                   objLower.includes('кухня') || techLower.includes('кухня')) {
          finalZoneName = 'Зона отдыха';
          finalRoomGroupName = 'Столовая и буфеты';
        } else if (objLower.includes('раздевалка') || techLower.includes('раздевалка') ||
                   objLower.includes('душевая') || techLower.includes('душевая')) {
          finalZoneName = 'Бытовые помещения';
          finalRoomGroupName = 'Раздевалки и душевые';
        } else if (objLower.includes('приемная') || techLower.includes('приемная') ||
                   objLower.includes('ресепшн') || techLower.includes('ресепшн')) {
          finalZoneName = 'Зона приема';
          finalRoomGroupName = 'Приемная и ресепшн';
        } else if (objLower.includes('территория') || techLower.includes('территория') ||
                   objLower.includes('двор') || techLower.includes('двор')) {
          finalZoneName = 'Территория компании';
          finalRoomGroupName = 'Прилегающая территория';
        }

        // Определяем тип работы
        let workType = 'Общая уборка';
        
        if (techLower.includes('влажная') && techLower.includes('пол')) {
          workType = 'Влажная уборка полов';
        } else if (techLower.includes('влажная')) {
          workType = 'Влажная уборка';
        } else if (techLower.includes('сухая')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('генеральная')) {
          workType = 'Генеральная уборка';
        } else if (techLower.includes('вынос мусора') || techLower.includes('мусорные корзины')) {
          workType = 'Уборка мусора';
        } else if (techLower.includes('мытье') || techLower.includes('мойка')) {
          workType = 'Мойка поверхностей';
        } else if (techLower.includes('окна')) {
          workType = 'Мойка окон';
        } else if (techLower.includes('дезинфекц')) {
          workType = 'Дезинфекция';
        } else if (techLower.includes('обеспыливание')) {
          workType = 'Обеспыливание';
        } else if (techLower.includes('подметание')) {
          workType = 'Подметание';
        } else if (techLower.includes('пылесос')) {
          workType = 'Пылесосение';
        } else if (techLower.includes('уборка снега') || techLower.includes('посыпка')) {
          workType = 'Зимняя уборка';
        } else if (techLower.includes('уход за газонами') || techLower.includes('стрижка')) {
          workType = 'Уход за территорией';
        }

        // Определяем период выполнения
        let cleanPeriod = 'Ежедневно';
        const freqLower = cleanFrequency.toLowerCase();
        
        if (freqLower.includes('ежедневно') || freqLower.includes('1 раз в день') || 
            freqLower.includes('1раз в день')) {
          cleanPeriod = 'Ежедневно';
        } else if (freqLower.includes('с пн по пт') || freqLower.includes('рабочие дни')) {
          cleanPeriod = 'Рабочие дни';
        } else if (freqLower.includes('с пн по вс')) {
          cleanPeriod = 'Ежедневно';
        } else if (freqLower.includes('1 раз в неделю') || freqLower.includes('еженедельно')) {
          cleanPeriod = 'Еженедельно';
        } else if (freqLower.includes('2 раза в неделю')) {
          cleanPeriod = 'Два раза в неделю';
        } else if (freqLower.includes('3 раза в неделю')) {
          cleanPeriod = 'Три раза в неделю';
        } else if (freqLower.includes('1 раз в месяц') || freqLower.includes('ежемесячно')) {
          cleanPeriod = 'Ежемесячно';
        } else if (freqLower.includes('2 раза в год')) {
          cleanPeriod = 'Два раза в год';
        } else if (freqLower.includes('по мере необходимости')) {
          cleanPeriod = 'По мере необходимости';
        } else if (freqLower.includes('1 раз в квартал')) {
          cleanPeriod = 'Ежеквартально';
        } else if (freqLower.includes('сезонно')) {
          cleanPeriod = 'Сезонно';
        }

        const record = {
          objectName: objectName,
          siteName: siteName || 'Сервисная компания',
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

        yugServiceRecords.push(record);
      }
    });

    console.log(`📋 Обработано записей: ${yugServiceRecords.length}\n`);

    // Показываем структуру
    console.log('🏗️ СТРУКТУРА ОБЪЕКТА:');
    console.log('=====================');
    
    const groupedData = {};
    yugServiceRecords.forEach(record => {
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

    for (const [index, record] of yugServiceRecords.entries()) {
      try {
        const techCardId = `yugservice_${index + 1}_${Date.now()}`;
        
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
          console.log(`✅ Загружено ${index + 1}/${yugServiceRecords.length} записей`);
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
    console.log(`📊 Всего записей: ${yugServiceRecords.length}`);

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

    console.log('\n✅ ЗАГРУЗКА ОБЪЕКТА "ЮГ-СЕРВИС" ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectYugService();
