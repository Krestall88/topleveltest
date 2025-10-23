const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestRooms() {
  try {
    console.log('🏠 Добавляем тестовые помещения и техкарты...');

    // Берем объект без помещений
    const objectId = 'cmgyu2lll0001vyjoza1nt975'; // ООО "БЦ «Сфера"
    
    // Создаем помещения
    const rooms = [
      {
        name: 'Офис 101',
        description: 'Основной офис',
        area: 45.5,
        objectId
      },
      {
        name: 'Переговорная',
        description: 'Комната для переговоров',
        area: 25.0,
        objectId
      },
      {
        name: 'Кухня',
        description: 'Кухонная зона',
        area: 15.5,
        objectId
      }
    ];

    for (const roomData of rooms) {
      const room = await prisma.room.create({
        data: roomData
      });

      // Создаем техкарты для помещения
      const techCards = [
        {
          name: `Ежедневная уборка - ${room.name}`,
          workType: 'Ежедневная уборка',
          frequency: 'Ежедневно',
          description: `Влажная уборка помещения ${room.name}`,
          period: 'Круглогодично',
          objectId,
          roomId: room.id
        },
        {
          name: `Генеральная уборка - ${room.name}`,
          workType: 'Генеральная уборка',
          frequency: 'Еженедельно',
          description: `Генеральная уборка помещения ${room.name}`,
          period: 'Круглогодично',
          notes: 'Особое внимание к труднодоступным местам',
          objectId,
          roomId: room.id
        }
      ];

      for (const techCardData of techCards) {
        await prisma.techCard.create({
          data: techCardData
        });
      }

      console.log(`✅ Создано помещение: ${room.name} с 2 техкартами`);
    }

    console.log('\n🎉 Тестовые данные добавлены!');
    console.log('Теперь можно проверить объект ООО "БЦ «Сфера"');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestRooms();
