import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Создаем виртуальные участки для объектов без участков...\n');
  
  // Находим все объекты без участков
  const objectsWithoutSites = await prisma.cleaningObject.findMany({
    where: {
      sites: {
        none: {}
      }
    },
    select: {
      id: true,
      name: true
    }
  });
  
  console.log(`📊 Найдено объектов без участков: ${objectsWithoutSites.length}\n`);
  
  let created = 0;
  
  for (const object of objectsWithoutSites) {
    try {
      // Создаем виртуальный участок
      const site = await prisma.site.create({
        data: {
          name: `__VIRTUAL__${object.name}`,
          objectId: object.id,
          comment: null
        }
      });
      
      console.log(`✅ Создан виртуальный участок для: ${object.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Ошибка создания участка для ${object.name}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 ИТОГО:`);
  console.log(`✅ Создано виртуальных участков: ${created}`);
  console.log(`📝 Всего объектов без участков: ${objectsWithoutSites.length}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
