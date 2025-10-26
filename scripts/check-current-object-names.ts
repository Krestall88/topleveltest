import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentNames() {
  try {
    console.log('🔍 Проверка текущих названий объектов...\n');

    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        manager: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            techCards: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Всего объектов: ${objects.length}\n`);
    console.log('Текущие названия:');
    console.log('='.repeat(80));

    objects.forEach(obj => {
      console.log(`${obj.name}`);
      console.log(`  ID: ${obj.id}`);
      console.log(`  Менеджер: ${obj.manager?.name || 'Не назначен'}`);
      console.log(`  Техкарт: ${obj._count.techCards}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentNames()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
