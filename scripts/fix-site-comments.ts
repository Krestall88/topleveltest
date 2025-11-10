import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Исправляем comment участков...\n');
  
  // Находим все участки
  const sites = await prisma.site.findMany({
    include: {
      object: {
        select: {
          name: true
        }
      }
    }
  });
  
  console.log(`📊 Найдено участков: ${sites.length}\n`);
  
  let updated = 0;
  
  for (const site of sites) {
    try {
      // Если comment содержит "Участок объекта" или пустой, заменяем на name
      if (!site.comment || site.comment.includes('Участок объекта')) {
        // Для виртуальных участков оставляем comment пустым
        if (site.name.includes('__VIRTUAL__')) {
          await prisma.site.update({
            where: { id: site.id },
            data: { comment: null }
          });
          console.log(`✅ ${site.object.name} → виртуальный участок → comment = null`);
        } else {
          // Для обычных участков копируем name в comment
          await prisma.site.update({
            where: { id: site.id },
            data: { comment: site.name }
          });
          console.log(`✅ ${site.object.name} → ${site.name} → comment обновлен`);
        }
        updated++;
      }
    } catch (error) {
      console.error(`❌ Ошибка обновления участка ${site.name}:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 ИТОГО:`);
  console.log(`✅ Обновлено участков: ${updated}`);
  console.log(`📝 Всего участков: ${sites.length}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
