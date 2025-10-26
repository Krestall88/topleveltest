import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function analyzeTechCardData() {
  try {
    console.log('🔍 Анализ данных техкарт...\n');

    // Получаем все уникальные значения frequency
    const frequencies = await prisma.techCard.groupBy({
      by: ['frequency'],
      _count: {
        frequency: true
      },
      orderBy: {
        _count: {
          frequency: 'desc'
        }
      }
    });

    console.log('📊 ПЕРИОДИЧНОСТЬ (frequency):');
    console.log('='.repeat(60));
    frequencies.forEach(f => {
      console.log(`${f.frequency || 'NULL'}: ${f._count.frequency} техкарт`);
    });

    // Получаем все уникальные названия задач
    const names = await prisma.techCard.groupBy({
      by: ['name'],
      _count: {
        name: true
      },
      orderBy: {
        _count: {
          name: 'desc'
        }
      },
      take: 50 // Топ 50 самых частых названий
    });

    console.log('\n📊 ТОП-50 НАЗВАНИЙ ЗАДАЧ (name):');
    console.log('='.repeat(60));
    names.forEach(n => {
      console.log(`${n.name}: ${n._count.name} техкарт`);
    });

    // Сохраняем в файл для детального анализа
    const exportData = {
      frequencies: frequencies.map(f => ({
        frequency: f.frequency,
        count: f._count.frequency
      })),
      topNames: names.map(n => ({
        name: n.name,
        count: n._count.name
      }))
    };

    const exportPath = path.join(__dirname, 'techcard-analysis.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log(`\n✅ Анализ сохранен: ${exportPath}`);
    console.log('\n💡 Следующий шаг: создайте маппинг для унификации');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTechCardData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
