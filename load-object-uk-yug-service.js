const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadObjectUKYugService() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: УК Юг-сервис');
    console.log('=================================\n');

    // Читаем файл и фильтруем строки для УК Юг-сервис
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const yugServiceLines = lines.filter(line => 
      line.includes('УК Юг-сервис') || line.includes('Юг-сервис')
    );
    console.log(`📋 Найдено строк для УК Юг-сервис: ${yugServiceLines.length}\n`);

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
    const objectName = 'УК Юг-сервис';
    const objectAddress = 'г. Самара, управляющая компания';

    let cleaningObject = await prisma.cleaningObject.findFirst({
      where: { 
        OR: [
          { name: objectName },
          { name: { contains: 'Юг-сервис' } }
        ]
      }
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
          description: 'УК Юг-сервис - управляющая компания',
          creatorId: admin.id
        }
      });
      console.log(`✅ Создан новый объект: ${objectName}`);
    } else {
      console.log(`📍 Найден существующий объект: ${cleaningObject.name}`);
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
        const objectNameFromFile = parts[0]?.trim() || '';
        
        // Проверяем, что это действительно строка с УК Юг-сервис
        if (!objectNameFromFile.includes('Юг-сервис')) {
          return;
        }

        const address = parts[1]?.trim() || '';
        const siteName = parts[2]?.trim() || 'Управляющая компания';
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

        // Определяем зону и группу помещений для управляющей компании
        let finalZoneName = zoneName || 'Жилая зона';
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

        // Анализируем тип помещения по названию для управляющей компании
        const techLower = cleanTechCardName.toLowerCase();
        const objLower = cleaningObjectName.toLowerCase();
        
        if (objLower.includes('подъезд') || techLower.includes('подъезд') ||
            objLower.includes('лестниц') || techLower.includes('лестниц')) {
          finalZoneName = 'Места общего пользования';
          finalRoomGroupName = 'Подъезды и лестницы';
        } else if (objLower.includes('двор') || techLower.includes('двор') ||
                   objLower.includes('территория') || techLower.includes('территория') ||
                   objLower.includes('придомовая') || techLower.includes('придомовая')) {
          finalZoneName = 'Придомовая территория';
          finalRoomGroupName = 'Дворовая территория';
        } else if (objLower.includes('контейнер') || techLower.includes('контейнер') ||
                   objLower.includes('мусор') || techLower.includes('мусор')) {
          finalZoneName = 'Контейнерные площадки';
          finalRoomGroupName = 'Мусорные площадки';
        } else if (objLower.includes('газон') || techLower.includes('газон') ||
                   objLower.includes('клумба') || techLower.includes('клумба')) {
          finalZoneName = 'Зеленые зоны';
          finalRoomGroupName = 'Газоны и клумбы';
        } else if (objLower.includes('парковка') || techLower.includes('парковка') ||
                   objLower.includes('стоянка') || techLower.includes('стоянка')) {
          finalZoneName = 'Парковочные зоны';
          finalRoomGroupName = 'Автостоянки';
        } else if (objLower.includes('детская') || techLower.includes('детская') ||
                   objLower.includes('площадка') || techLower.includes('площадка')) {
          finalZoneName = 'Детские зоны';
          finalRoomGroupName = 'Детские площадки';
        } else if (objLower.includes('офис') || techLower.includes('офис') ||
                   objLower.includes('администрация') || techLower.includes('администрация')) {
          finalZoneName = 'Административная зона';
          finalRoomGroupName = 'Офисы УК';
        }

        // Определяем тип работы
        let workType = 'Общая уборка';
        
        if (techLower.includes('влажная') && techLower.includes('пол')) {
          workType = 'Влажная уборка полов';
        } else if (techLower.includes('влажная')) {
          workType = 'Влажная уборка';
        } else if (techLower.includes('сухая')) {
          workType = 'Сухая уборка';
        } else if (techLower.includes('подметание')) {
          workType = 'Подметание';
        } else if (techLower.includes('мытье') || techLower.includes('мойка')) {
          workType = 'Мойка поверхностей';
        } else if (techLower.includes('уборка снега') || techLower.includes('снег')) {
          workType = 'Зимняя уборка';
        } else if (techLower.includes('посыпка') || techLower.includes('песок')) {
          workType = 'Противогололедная обработка';
        } else if (techLower.includes('газон') || techLower.includes('трава')) {
          workType = 'Уход за газонами';
        } else if (techLower.includes('мусор') || techLower.includes('контейнер')) {
          workType = 'Уборка мусора';
        } else if (techLower.includes('окна')) {
          workType = 'Мойка окон';
        } else if (techLower.includes('дезинфекц')) {
          workType = 'Дезинфекция';
        }

        // Определяем период выполнения
        let cleanPeriod = 'Ежедневно';
        const freqLower = cleanFrequency.toLowerCase();
        
        if (freqLower.includes('ежедневно') || freqLower.includes('1 раз в день') || 
            freqLower.includes('1раз в день')) {
          cleanPeriod = 'Ежедневно';
        } else if (freqLower.includes('5/2') || freqLower.includes('рабочие дни')) {
          cleanPeriod = 'Рабочие дни';
        } else if (freqLower.includes('6/1')) {
          cleanPeriod = 'Шесть дней в неделю';
        } else if (freqLower.includes('1 раз в неделю') || freqLower.includes('еженедельно')) {
          cleanPeriod = 'Еженедельно';
        } else if (freqLower.includes('2 раза в неделю')) {
          cleanPeriod = 'Два раза в неделю';
        } else if (freqLower.includes('3 раза в неделю')) {
          cleanPeriod = 'Три раза в неделю';
        } else if (freqLower.includes('1 раз в месяц') || freqLower.includes('ежемесячно')) {
          cleanPeriod = 'Ежемесячно';
        } else if (freqLower.includes('2 раза в месяц')) {
          cleanPeriod = 'Два раза в месяц';
        } else if (freqLower.includes('по мере необходимости')) {
          cleanPeriod = 'По мере необходимости';
        } else if (freqLower.includes('сезонно')) {
          cleanPeriod = 'Сезонно';
        }

        const record = {
          objectName: objectName,
          siteName: siteName || 'Управляющая компания',
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

    if (yugServiceRecords.length === 0) {
      console.log('⚠️ Не найдено данных для УК Юг-сервис');
      console.log('✅ ЗАГРУЗКА ЗАВЕРШЕНА (НЕТ ДАННЫХ)');
      return;
    }

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
        const techCardId = `yug_service_${index + 1}_${Date.now()}`;
        
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

    console.log('\n✅ ЗАГРУЗКА ОБЪЕКТА "УК ЮГ-СЕРВИС" ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectUKYugService();
