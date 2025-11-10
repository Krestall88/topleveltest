import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkManager() {
  const searchName = 'Васекин Александр Александрович';
  
  console.log(`🔍 Поиск менеджера: "${searchName}"\n`);
  
  // Точное совпадение
  const exactMatch = await prisma.user.findFirst({
    where: {
      name: { equals: searchName, mode: 'insensitive' },
      role: 'MANAGER'
    }
  });
  
  if (exactMatch) {
    console.log('✅ Найден точным совпадением:');
    console.log(`   ID: ${exactMatch.id}`);
    console.log(`   Имя: ${exactMatch.name}`);
    console.log(`   Email: ${exactMatch.email}`);
    console.log(`   Телефон: ${exactMatch.phone || 'не указан'}\n`);
  } else {
    console.log('❌ Точное совпадение не найдено\n');
  }
  
  // Частичное совпадение
  const partialMatch = await prisma.user.findFirst({
    where: {
      name: { contains: searchName, mode: 'insensitive' },
      role: 'MANAGER'
    }
  });
  
  if (partialMatch) {
    console.log('✅ Найден частичным совпадением:');
    console.log(`   ID: ${partialMatch.id}`);
    console.log(`   Имя: ${partialMatch.name}`);
    console.log(`   Email: ${partialMatch.email}`);
    console.log(`   Телефон: ${partialMatch.phone || 'не указан'}\n`);
  } else {
    console.log('❌ Частичное совпадение не найдено\n');
  }
  
  // Поиск по частям имени
  const nameParts = searchName.split(' ');
  console.log(`🔍 Поиск по частям имени: ${nameParts.join(', ')}\n`);
  
  for (const part of nameParts) {
    const managers = await prisma.user.findMany({
      where: {
        name: { contains: part, mode: 'insensitive' },
        role: 'MANAGER'
      }
    });
    
    if (managers.length > 0) {
      console.log(`✅ Найдено ${managers.length} менеджеров с "${part}" в имени:`);
      managers.forEach(m => {
        console.log(`   - ${m.name} (${m.email})`);
      });
      console.log();
    }
  }
  
  // Список всех менеджеров
  const allManagers = await prisma.user.findMany({
    where: { role: 'MANAGER' },
    orderBy: { name: 'asc' }
  });
  
  console.log(`📋 Всего менеджеров в системе: ${allManagers.length}\n`);
  console.log('Список всех менеджеров:');
  allManagers.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name} (${m.email})`);
  });
  
  await prisma.$disconnect();
}

checkManager().catch(console.error);
