const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findManagerId() {
  try {
    const manager = await prisma.user.findFirst({
      where: { 
        name: 'Нувальцева Мария Александровна',
        role: 'MANAGER'
      },
      select: { id: true, name: true }
    });

    if (manager) {
      console.log(`ID менеджера "${manager.name}": ${manager.id}`);
    } else {
      console.log('Менеджер не найден');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findManagerId();
