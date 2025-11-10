import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const objects = await prisma.cleaningObject.findMany({
    select: { name: true },
    orderBy: { name: 'asc' }
  });
  
  console.log(`\n📋 Объекты в БД (${objects.length}):\n`);
  objects.forEach(o => console.log(`  - ${o.name}`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
