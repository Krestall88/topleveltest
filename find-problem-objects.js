const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findProblemObjects() {
  console.log('🔍 Ищем проблемные объекты...\n');

  const searches = [
    { term: 'Альфа', description: 'ООО «Альфа» (ТЦ Мелодия)' },
    { term: 'БЦ', description: 'ООО "БЦ "Сфера"' },
    { term: 'Сфера', description: 'ООО "БЦ "Сфера"' },
    { term: 'Электрощит-Инжиниринг', description: 'ООО "Электрощит-Инжиниринг"' },
    { term: 'ТЯЖМАШ', description: 'АО "Тяжмаш"' }
  ];

  for (const search of searches) {
    console.log(`🔍 Поиск: ${search.description}`);
    
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
      console.log(`✅ Найдено ${objects.length} объектов:`);
      objects.forEach(obj => {
        console.log(`   "${obj.name}"`);
      });
    } else {
      console.log(`❌ Объекты не найдены`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

findProblemObjects();
