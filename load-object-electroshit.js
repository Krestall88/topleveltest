const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadObjectElectroshit() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: ООО «Электрощит-Инжиниринг»');
    console.log('===============================================\n');

    // Читаем файл и фильтруем строки для Электрощита
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const electroshitLines = lines.filter(line => line.includes('Электрощит-Инжиниринг'));
    console.log(`📋 Найдено строк для Электрощита: ${electroshitLines.length}\n`);

    // Анализируем первые строки для понимания структуры
    console.log('🔍 АНАЛИЗ СТРУКТУРЫ ДАННЫХ:');
    electroshitLines.slice(0, 3).forEach((line, index) => {
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
    const objectName = 'ООО «Электрощит-Инжиниринг»';
    const objectAddress = 'г. Самара, ул. Садовая, д. 200';

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
          description: 'Офисное здание компании Электрощит-Инжиниринг (407,2 м²)',
          totalArea: 407.2,
          creatorId: admin.id
        }
      });
      console.log(`✅ Создан новый объект: ${objectName}`);
    } else {
      console.log(`📍 Найден существующий объект: ${objectName}`);
    }

    console.log(`   ID объекта: ${cleaningObject.id}`);
    console.log(`   Адрес: ${cleaningObject.address}`);
    console.log(`   Площадь: 407,2 м²\n`);

    // Очищаем старые данные ObjectStructure для этого объекта
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: cleaningObject.id }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Парсим и загружаем данные
    console.log('📊 ПАРСИНГ И ЗАГРУЗКА ДАННЫХ:');
    const electroshitRecords = [];

    electroshitLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 8) {
        const objectName = parts[0]?.trim() || 'ООО «Электрощит-Инжиниринг»';
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
          .trim();

        const cleanFrequency = frequency
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const cleanNotes = notes
          .replace(/"/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Определяем зону и группу помещений из roomGroupName
        let finalZoneName = 'Офисная зона';
        let finalRoomGroupName = roomGroupName || 'Общие помещения';

        if (roomGroupName) {
          const roomGroupLower = roomGroupName.toLowerCase();
          if (roomGroupLower.includes('кабинет')) {
            finalZoneName = 'Рабочие кабинеты';
            finalRoomGroupName = 'Кабинеты';
          } else if (roomGroupLower.includes('санитарн') || roomGroupLower.includes('туалет')) {
            finalZoneName = 'Санитарные помещения';
            finalRoomGroupName = 'Туалеты';
          } else if (roomGroupLower.includes('комната приема пищи') || roomGroupLower.includes('кухня')) {
            finalZoneName = 'Зона отдыха';
            finalRoomGroupName = 'Комната приема пищи';
          } else if (roomGroupLower.includes('коридор') || roomGroupLower.includes('холл')) {
            finalZoneName = 'Общие зоны';
            finalRoomGroupName = 'Коридоры и холлы';
          }
        }

        // Определяем тип работы
        let workType = 'Общая уборка';
        const techLower = cleanTechCardName.toLowerCase();
        if (techLower.includes('влажная') && techLower.includes('пол')) {
          workType = 'Влажная уборка полов';
        } else if (techLower.includes('влажная')) {
          workType = 'Влажная уборка';
        } else if (techLower.includes('сухая')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('дезинфекц')) {
          workType = 'Дезинфекция';
        } else if (techLower.includes('вынос мусора')) {
          workType = 'Уборка мусора';
        } else if (techLower.includes('комплектация')) {
          workType = 'Комплектация расходными материалами';
        } else if (techLower.includes('мойка') || techLower.includes('мытье')) {
          workType = 'Мойка поверхностей';
        }

        // Определяем период
        let cleanPeriod = 'Ежедневно';
        const freqLower = cleanFrequency.toLowerCase();
        
        if (freqLower.includes('ежедневно')) {
          cleanPeriod = 'Ежедневно';
        } else if (freqLower.includes('1 раз в неделю') || freqLower.includes('раз в неделю')) {
          cleanPeriod = 'Еженедельно';
        } else if (freqLower.includes('1 раз в месяц') || freqLower.includes('раз в месяц')) {
          cleanPeriod = 'Ежемесячно';
        } else if (freqLower.includes('1 раз в 3 месяца') || freqLower.includes('раз в 3 месяца')) {
          cleanPeriod = 'Ежеквартально';
        } else if (freqLower.includes('2 раза в год')) {
          cleanPeriod = 'Два раза в год';
        } else if (freqLower.includes('по мере необходимости')) {
          cleanPeriod = 'По мере необходимости';
        }

        const record = {
          objectName: objectName.replace(' 407,2м2.', ''), // убираем площадь из названия
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

        electroshitRecords.push(record);
      }
    });

    console.log(`📋 Обработано записей: ${electroshitRecords.length}\n`);

    // Показываем структуру
    console.log('🏗️ СТРУКТУРА ОБЪЕКТА:');
    console.log('=====================');
    
    const groupedData = {};
    electroshitRecords.forEach(record => {
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

    for (const [index, record] of electroshitRecords.entries()) {
      try {
        const techCardId = `electroshit_${index + 1}_${Date.now()}`;
        
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
          console.log(`✅ Загружено ${index + 1}/${electroshitRecords.length} записей`);
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
    console.log(`📊 Всего записей: ${electroshitRecords.length}`);

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

    console.log('\n✅ ЗАГРУЗКА ОБЪЕКТА "ЭЛЕКТРОЩИТ" ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectElectroshit();
