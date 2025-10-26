import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportTechCards() {
  try {
    console.log('📤 Экспорт техкарт для редактирования...\n');

    const techCards = await prisma.techCard.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        frequency: true,
        workType: true,
        objectId: true,
        roomId: true,
        object: {
          select: {
            name: true
          }
        },
        room: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { object: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    console.log(`📊 Найдено ${techCards.length} техкарт\n`);

    // Преобразуем в формат для Excel
    const excelData = techCards.map(tc => ({
      id: tc.id,
      objectName: tc.object.name,
      roomName: tc.room?.name || '',
      taskName: tc.name,
      frequency: tc.frequency || '',
      workType: tc.workType || '',
      description: tc.description || '',
      objectId: tc.objectId,
      roomId: tc.roomId || ''
    }));

    // Сохраняем в JSON (потом конвертируем в CSV для Excel)
    const jsonPath = path.join(__dirname, 'techcards-export.json');
    fs.writeFileSync(jsonPath, JSON.stringify(excelData, null, 2), 'utf-8');

    // Создаем CSV для Excel
    const csvPath = path.join(__dirname, 'techcards-export.csv');
    const headers = [
      'id',
      'objectName', 
      'roomName',
      'taskName',
      'frequency',
      'workType',
      'description',
      'objectId',
      'roomId'
    ];
    
    const csvLines = [
      headers.join('\t'), // Используем TAB для Excel
      ...excelData.map(row => [
        row.id,
        row.objectName,
        row.roomName,
        row.taskName,
        row.frequency,
        row.workType,
        row.description,
        row.objectId,
        row.roomId
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join('\t'))
    ];

    fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\n'), 'utf-8'); // BOM для корректной кодировки

    console.log('✅ Файлы созданы:');
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   CSV:  ${csvPath}`);
    console.log('\n📝 Инструкция:');
    console.log('1. Откройте techcards-export.csv в Excel');
    console.log('2. Отредактируйте столбцы taskName и frequency');
    console.log('3. НЕ ИЗМЕНЯЙТЕ столбец id (это критично!)');
    console.log('4. Сохраните как CSV (разделитель - табуляция)');
    console.log('5. Переименуйте в techcards-import.csv');
    console.log('6. Запустите: npm run import-techcards');

    // Статистика по дубликатам
    console.log('\n📊 Анализ потенциальных дубликатов:');
    
    const duplicates = new Map<string, number>();
    techCards.forEach(tc => {
      const key = `${tc.objectId}|${tc.roomId || 'null'}|${tc.name}|${tc.frequency}`;
      duplicates.set(key, (duplicates.get(key) || 0) + 1);
    });

    const dupsCount = Array.from(duplicates.values()).filter(count => count > 1).length;
    console.log(`⚠️ Найдено ${dupsCount} групп потенциальных дубликатов`);
    console.log('   (одинаковые: объект + помещение + название + периодичность)');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportTechCards()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
