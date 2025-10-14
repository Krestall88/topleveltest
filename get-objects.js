const { PrismaClient } = require('@prisma/client');

async function getObjects() {
  const prisma = new PrismaClient();
  
  try {
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('🏢 ТЕКУЩИЕ ОБЪЕКТЫ В БАЗЕ ДАННЫХ:');
    console.log('='.repeat(50));
    
    objects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   Адрес: ${obj.address}`);
      console.log(`   ID: ${obj.id}`);
      console.log('');
    });
    
    console.log(`📊 Всего объектов: ${objects.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getObjects();
