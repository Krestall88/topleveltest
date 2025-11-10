import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Проверяем категории расходов в БД...\n');
  
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { name: 'asc' }
  });
  
  console.log(`Найдено категорий: ${categories.length}\n`);
  
  categories.forEach((cat, index) => {
    console.log(`${index + 1}. "${cat.name}" (ID: ${cat.id})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
