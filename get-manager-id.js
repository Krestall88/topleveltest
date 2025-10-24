const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getManagerId() {
  try {
    const manager = await prisma.user.findFirst({
      where: { 
        name: 'Нувальцева Мария Александровна',
        role: 'MANAGER'
      }
    });

    if (manager) {
      console.log(`ID менеджера "Нувальцева Мария Александровна": ${manager.id}`);
      console.log(`Тестовый URL: http://localhost:3002/api/managers/${manager.id}/details`);
    } else {
      console.log('Менеджер не найден');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getManagerId();
