import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Поиск объектов для менеджеров...\n');

  const searchTerms = [
    { manager: 'Тимохина Анна Анатольевна', terms: ['Тяжмаш', 'Сызрань', 'Гидротурбинная'] },
    { manager: 'Гордеев Роман Владимирович', terms: ['Маркет', 'Яндекс', 'Придорожный', 'Преображенка'] },
    { manager: 'Ласкин Павел Александрович', terms: ['ПепсиКо', 'Пепси', '5 квартал', 'Мяги'] }
  ];

  for (const search of searchTerms) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 ${search.manager}`);
    console.log('='.repeat(80));

    for (const term of search.terms) {
      console.log(`\n🔎 Поиск по термину: "${term}"`);
      
      const objects = await prisma.cleaningObject.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { address: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          address: true,
          manager: {
            select: {
              name: true
            }
          }
        },
        take: 5
      });

      if (objects.length > 0) {
        console.log(`   Найдено объектов: ${objects.length}`);
        objects.forEach((obj, i) => {
          console.log(`   ${i + 1}. ${obj.name}`);
          console.log(`      ${obj.address}`);
          console.log(`      Менеджер: ${obj.manager?.name || 'не назначен'}`);
        });
      } else {
        console.log(`   ❌ Не найдено`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Поиск завершен');
  console.log('='.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
