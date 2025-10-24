const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findExactNames() {
  console.log('🔍 Ищем точные названия проблемных объектов...\n');

  const searches = [
    { term: 'Альфа', description: 'ООО «Альфа»' },
    { term: 'ТЯЖМАШ', description: 'АО "Тяжмаш"' },
    { term: 'Тяжмаш', description: 'АО "Тяжмаш"' },
    { term: 'БЦ', description: 'ООО "БЦ "Сфера"' },
    { term: 'Сфера', description: 'ООО "БЦ "Сфера"' },
    { term: 'Электрощит-Инжиниринг', description: 'ООО "Электрощит-Инжиниринг"' },
    { term: 'Инжиниринг', description: 'ООО "Электрощит-Инжиниринг"' }
  ];

  for (const search of searches) {
    console.log(`🔍 Поиск по "${search.term}" (${search.description}):`);
    
    const objects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: search.term,
          mode: 'insensitive'
        }
      },
      select: {
        name: true
      }
    });

    if (objects.length > 0) {
      objects.forEach(obj => {
        console.log(`   ✅ "${obj.name}"`);
      });
    } else {
      console.log(`   ❌ Не найдено`);
    }
    console.log('');
  }

  // Покажем все объекты для справки
  console.log('📋 ВСЕ ОБЪЕКТЫ В БД:');
  console.log('='.repeat(50));
  const allObjects = await prisma.cleaningObject.findMany({
    select: { name: true },
    orderBy: { name: 'asc' }
  });

  allObjects.forEach((obj, index) => {
    console.log(`${index + 1}. "${obj.name}"`);
  });

  await prisma.$disconnect();
}

findExactNames();
