import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  'наименование объекта': string;
  [key: string]: any;
}

async function main() {
  console.log('🔍 АНАЛИЗ И ИСПРАВЛЕНИЕ НАЗВАНИЙ ОБЪЕКТОВ\n');
  
  // Читаем JSON
  const jsonPath = path.join(__dirname, '..', 'objects-data.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: ExcelRow[] = JSON.parse(rawData);
  
  // Получаем уникальные названия из Excel
  const excelObjects = new Set<string>();
  data.forEach(row => {
    const name = row['наименование объекта']?.trim();
    if (name) excelObjects.add(name);
  });
  
  console.log(`📊 Уникальных объектов в Excel: ${excelObjects.size}\n`);
  
  // Получаем объекты из БД
  const dbObjects = await prisma.cleaningObject.findMany({
    select: { id: true, name: true }
  });
  
  console.log(`📊 Объектов в БД: ${dbObjects.length}\n`);
  
  // Создаем Map для быстрого поиска
  const dbObjectsMap = new Map(dbObjects.map(o => [o.name, o.id]));
  
  // Находим несовпадения
  const notFound: string[] = [];
  const similarMatches: Array<{ excel: string; db: string; similarity: number }> = [];
  
  for (const excelName of excelObjects) {
    if (!dbObjectsMap.has(excelName)) {
      notFound.push(excelName);
      
      // Ищем похожие названия в БД
      for (const dbObject of dbObjects) {
        const similarity = calculateSimilarity(excelName, dbObject.name);
        if (similarity > 0.7) {
          similarMatches.push({
            excel: excelName,
            db: dbObject.name,
            similarity
          });
        }
      }
    }
  }
  
  console.log('❌ ОБЪЕКТЫ НЕ НАЙДЕНЫ В БД:\n');
  notFound.forEach(name => console.log(`  - ${name}`));
  
  console.log('\n🔗 ВОЗМОЖНЫЕ СОВПАДЕНИЯ:\n');
  similarMatches
    .sort((a, b) => b.similarity - a.similarity)
    .forEach(match => {
      console.log(`  ${(match.similarity * 100).toFixed(0)}% - Excel: "${match.excel}"`);
      console.log(`       DB: "${match.db}"\n`);
    });
  
  // Предлагаем исправления
  console.log('🔧 ПРЕДЛАГАЕМЫЕ ИСПРАВЛЕНИЯ:\n');
  
  const fixes = [
    {
      from: 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)',
      to: 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС")'
    },
    {
      from: 'ОАО "Самарский хлебозавод №5"',
      to: 'ООО "Самарский хлебозавод №5"'
    },
    {
      from: 'ООО «Альфа» (ТЦ Мелодия)',
      to: 'ООО "Альфа" (ТЦ Мелодия)'
    },
    {
      from: 'ООО "ПК Фарика Качества"',
      to: 'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»'
    },
    {
      from: 'ПАО "БыстроБанк"',
      to: 'ПАО «БыстроБанк»'
    },
    {
      from: 'ЗАО «ГК «Электрощит» -ТМ Самара»',
      to: 'АО «ГК «Электрощит» -ТМ Самара»'
    }
  ];
  
  let fixedCount = 0;
  
  for (const fix of fixes) {
    // Проверяем существует ли объект с новым именем
    const targetObject = await prisma.cleaningObject.findFirst({
      where: { name: fix.to }
    });
    
    if (targetObject) {
      console.log(`✅ Будет использован: "${fix.to}"`);
      console.log(`   Вместо: "${fix.from}"\n`);
      fixedCount++;
    } else {
      // Проверяем существует ли объект со старым именем
      const sourceObject = await prisma.cleaningObject.findFirst({
        where: { name: fix.from }
      });
      
      if (sourceObject) {
        // Переименовываем
        await prisma.cleaningObject.update({
          where: { id: sourceObject.id },
          data: { name: fix.to }
        });
        console.log(`✏️  Переименован: "${fix.from}"`);
        console.log(`   В: "${fix.to}"\n`);
        fixedCount++;
      } else {
        console.log(`⚠️  Не найден ни один вариант для: "${fix.from}"\n`);
      }
    }
  }
  
  console.log(`\n✅ Исправлено: ${fixedCount} объектов\n`);
  
  await prisma.$disconnect();
}

// Функция для вычисления схожести строк (алгоритм Левенштейна упрощенный)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

main().catch(console.error);
