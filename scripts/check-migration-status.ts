import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ПРОВЕРКА СТАТУСА МИГРАЦИИ\n');
  
  // Проверяем менеджеров
  const managers = await prisma.user.findMany({
    where: { role: 'MANAGER' },
    select: { id: true, name: true, phone: true, email: true }
  });
  
  console.log(`👥 Менеджеров в системе: ${managers.length}`);
  console.log('Список менеджеров:');
  managers.forEach(m => {
    console.log(`  - ${m.name} (${m.phone || 'нет телефона'}) - ${m.email}`);
  });
  
  // Проверяем объекты
  const objects = await prisma.cleaningObject.findMany({
    select: { 
      id: true, 
      name: true, 
      address: true,
      sites: { select: { id: true, name: true } },
      techCards: { select: { id: true } }
    }
  });
  
  console.log(`\n🏢 Объектов в системе: ${objects.length}`);
  console.log('Список объектов:');
  objects.forEach(o => {
    console.log(`  - ${o.name}`);
    console.log(`    Адрес: ${o.address}`);
    console.log(`    Участков: ${o.sites.length}`);
    console.log(`    Техкарт: ${o.techCards.length}`);
  });
  
  // Проверяем участки
  const sites = await prisma.site.findMany({
    include: {
      manager: { select: { name: true } },
      seniorManager: { select: { name: true } },
      zones: { select: { id: true } }
    }
  });
  
  console.log(`\n🏗️  Участков в системе: ${sites.length}`);
  if (sites.length > 0) {
    console.log('Список участков:');
    sites.forEach(s => {
      console.log(`  - ${s.name}`);
      console.log(`    Менеджер: ${s.manager?.name || 'не назначен'}`);
      console.log(`    Старший менеджер: ${s.seniorManager?.name || 'не назначен'}`);
      console.log(`    Зон: ${s.zones.length}`);
    });
  }
  
  // Проверяем техкарты
  const techCards = await prisma.techCard.findMany({
    select: { 
      id: true, 
      name: true, 
      frequency: true,
      object: { select: { name: true } }
    },
    take: 10
  });
  
  console.log(`\n📋 Техкарт в системе: ${await prisma.techCard.count()}`);
  if (techCards.length > 0) {
    console.log('Первые 10 техкарт:');
    techCards.forEach(t => {
      console.log(`  - ${t.name} (${t.frequency}) - ${t.object.name}`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
