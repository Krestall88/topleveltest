import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TechCardImport {
  id: string;
  objectName: string;
  roomName: string;
  taskName: string;
  frequency: string;
  workType: string;
  description: string;
  objectId: string;
  roomId: string;
}

async function importTechCards() {
  try {
    console.log('📥 Импорт техкарт из Excel...\n');

    const csvPath = path.join(__dirname, 'techcards-import.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Файл techcards-import.csv не найден!');
      console.log('\n📝 Инструкция:');
      console.log('1. Отредактируйте techcards-export.csv в Excel');
      console.log('2. Сохраните как CSV (разделитель - табуляция)');
      console.log('3. Переименуйте в techcards-import.csv');
      console.log('4. Поместите в папку scripts/');
      return;
    }

    // Читаем CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, ''); // Убираем BOM
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      console.error('❌ Файл пустой или содержит только заголовки');
      return;
    }

    const headers = lines[0].split('\t').map(h => h.replace(/^"|"$/g, ''));
    const data: TechCardImport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
      
      if (values.length !== headers.length) {
        console.warn(`⚠️ Строка ${i + 1}: неверное количество столбцов, пропускаем`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      data.push(row as TechCardImport);
    }

    console.log(`📊 Загружено ${data.length} строк из CSV\n`);

    // Обновляем техкарты
    let updated = 0;
    let errors = 0;

    for (const row of data) {
      try {
        // Проверяем, существует ли техкарта
        const existing = await prisma.techCard.findUnique({
          where: { id: row.id }
        });

        if (!existing) {
          console.warn(`⚠️ Техкарта ${row.id} не найдена, пропускаем`);
          errors++;
          continue;
        }

        // Обновляем только name и frequency (безопасно)
        await prisma.techCard.update({
          where: { id: row.id },
          data: {
            name: row.taskName,
            frequency: row.frequency,
            workType: row.workType || undefined,
            description: row.description || undefined
          }
        });

        updated++;

        if (updated % 100 === 0) {
          console.log(`   Обновлено ${updated} техкарт...`);
        }

      } catch (error) {
        console.error(`❌ Ошибка при обновлении ${row.id}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Успешно обновлено: ${updated}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`📝 Всего строк: ${data.length}`);

    console.log('\n✅ Импорт завершен!');
    console.log('\n💡 Следующий шаг: проверьте изменения в UI');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importTechCards()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
