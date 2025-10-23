const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadFullPepsiData() {
  try {
    console.log('📊 ЗАГРУЗКА ПОЛНЫХ ДАННЫХ ПЕПСИ');
    console.log('===============================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

    // Сначала очищаем старые данные
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: pepsiObjectId }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Читаем файл context_1.md
    console.log('📖 Чтение данных из context_1.md...');
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');

    // Фильтруем строки с данными Пепси
    const pepsiLines = lines.filter(line => line.includes('Пепси 1 515 кв. м.'));
    console.log(`   Найдено строк с данными Пепси: ${pepsiLines.length}\n`);

    const pepsiRecords = [];

    // Парсим каждую строку
    pepsiLines.forEach((line, index) => {
      const parts = line.split('\t');
      
      if (parts.length >= 6) {
        const record = {
          objectName: parts[0]?.trim() || 'Пепси 1 515 кв. м.',
          siteName: parts[1]?.trim() || 'Производственный комплекс',
          zoneName: parts[3]?.trim() || '',
          roomGroupName: parts[4]?.trim() || '',
          roomName: parts[4]?.trim() || '', // Используем группу помещений как помещение
          cleaningObjectName: parts[5]?.trim() || '',
          techCardName: parts[6]?.trim() || '',
          frequency: parts[7]?.trim() || '',
          notes: parts[8]?.trim() || '',
          period: parts[9]?.trim() || ''
        };

        // Определяем тип работы на основе техкарты
        let workType = 'Общая уборка';
        if (record.techCardName.toLowerCase().includes('санитарная')) {
          workType = 'Санитарная уборка';
        } else if (record.techCardName.toLowerCase().includes('влажная')) {
          workType = 'Влажная уборка';
        } else if (record.techCardName.toLowerCase().includes('сухая')) {
          workType = 'Сухая уборка';
        } else if (record.techCardName.toLowerCase().includes('дезинфекц')) {
          workType = 'Дезинфекция';
        }

        record.workType = workType;
        record.description = `${record.techCardName}${record.cleaningObjectName ? ' - ' + record.cleaningObjectName : ''}`;

        // Пропускаем пустые записи
        if (record.techCardName && record.techCardName.trim() !== '') {
          pepsiRecords.push(record);
        }
      }
    });

    console.log(`📋 Обработано записей: ${pepsiRecords.length}\n`);

    // Показываем примеры записей
    console.log('🔍 ПРИМЕРЫ ОБРАБОТАННЫХ ЗАПИСЕЙ:');
    pepsiRecords.slice(0, 5).forEach((record, index) => {
      console.log(`${index + 1}. Зона: ${record.zoneName}`);
      console.log(`   Группа: ${record.roomGroupName}`);
      console.log(`   Объект уборки: ${record.cleaningObjectName}`);
      console.log(`   Техкарта: ${record.techCardName}`);
      console.log(`   Периодичность: ${record.frequency}`);
      console.log('');
    });

    // Загружаем в базу данных
    console.log('💾 ЗАГРУЗКА В БАЗУ ДАННЫХ:');
    console.log('==========================');

    let successCount = 0;
    let errorCount = 0;

    for (const [index, record] of pepsiRecords.entries()) {
      try {
        const techCardId = `pepsi_full_${index + 1}_${Date.now()}`;
        
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
        
        if ((index + 1) % 50 === 0) {
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

    // Анализируем загруженную структуру
    console.log('\n🏗️ АНАЛИЗ ЗАГРУЖЕННОЙ СТРУКТУРЫ:');
    console.log('=================================');

    const zones = await prisma.objectStructure.groupBy({
      by: ['zoneName'],
      where: { objectId: pepsiObjectId },
      _count: { zoneName: true }
    });

    console.log(`Всего зон: ${zones.length}`);
    zones.forEach((zone, index) => {
      console.log(`${index + 1}. ${zone.zoneName} (${zone._count.zoneName} техкарт)`);
    });

    const roomGroups = await prisma.objectStructure.groupBy({
      by: ['roomGroupName'],
      where: { objectId: pepsiObjectId },
      _count: { roomGroupName: true }
    });

    console.log(`\nВсего групп помещений: ${roomGroups.length}`);
    roomGroups.slice(0, 10).forEach((rg, index) => {
      console.log(`${index + 1}. ${rg.roomGroupName} (${rg._count.roomGroupName} техкарт)`);
    });

    if (roomGroups.length > 10) {
      console.log(`... и еще ${roomGroups.length - 10} групп`);
    }

    console.log('\n✅ ПОЛНАЯ ЗАГРУЗКА ЗАВЕРШЕНА!');
    console.log('Теперь в системе есть все данные по Пепси из context_1.md');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadFullPepsiData();
