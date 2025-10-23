const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createHierarchyTestData() {
  try {
    console.log('🏗️ Создание тестовых данных для многоуровневой иерархии...');

    // Находим первый объект
    const object = await prisma.cleaningObject.findFirst();
    if (!object) {
      console.log('❌ Не найдено ни одного объекта');
      return;
    }

    console.log(`📍 Работаем с объектом: ${object.name}`);

    // Создаем участок
    const site = await prisma.site.create({
      data: {
        name: 'Производственный участок №1',
        description: 'Основной производственный участок',
        area: 1500.0,
        objectId: object.id
      }
    });

    console.log(`✅ Создан участок: ${site.name}`);

    // Создаем зону
    const zone = await prisma.zone.create({
      data: {
        name: 'Зона производства',
        description: 'Основная производственная зона',
        area: 800.0,
        siteId: site.id
      }
    });

    console.log(`✅ Создана зона: ${zone.name}`);

    // Создаем группу помещений
    const roomGroup = await prisma.roomGroup.create({
      data: {
        name: 'Цех №1',
        description: 'Основной производственный цех',
        area: 400.0,
        zoneId: zone.id
      }
    });

    console.log(`✅ Создана группа помещений: ${roomGroup.name}`);

    // Обновляем существующие помещения, привязывая их к группе
    const rooms = await prisma.room.findMany({
      where: { objectId: object.id },
      take: 2
    });

    if (rooms.length > 0) {
      await prisma.room.update({
        where: { id: rooms[0].id },
        data: { roomGroupId: roomGroup.id }
      });
      console.log(`✅ Помещение "${rooms[0].name}" привязано к группе`);
    }

    // Создаем объекты уборки для помещения
    if (rooms.length > 0) {
      const cleaningObjects = [
        {
          name: 'Полы',
          description: 'Напольное покрытие',
          roomId: rooms[0].id
        },
        {
          name: 'Стены',
          description: 'Стеновые поверхности',
          roomId: rooms[0].id
        },
        {
          name: 'Окна',
          description: 'Оконные конструкции',
          roomId: rooms[0].id
        }
      ];

      for (const objData of cleaningObjects) {
        const cleaningObj = await prisma.cleaningObjectItem.create({
          data: objData
        });

        // Создаем техкарты для объекта уборки
        await prisma.techCard.create({
          data: {
            name: `Уборка: ${cleaningObj.name}`,
            workType: 'Ежедневная уборка',
            frequency: 'Ежедневно',
            description: `Детальная уборка ${cleaningObj.name.toLowerCase()}`,
            period: 'Круглогодично',
            notes: 'Особое внимание к качеству',
            objectId: object.id,
            roomId: rooms[0].id,
            cleaningObjectItemId: cleaningObj.id
          }
        });

        console.log(`✅ Создан объект уборки: ${cleaningObj.name} с техкартой`);
      }
    }

    // Создаем техкарты на разных уровнях
    await prisma.techCard.create({
      data: {
        name: 'Общие работы по объекту',
        workType: 'Общие работы',
        frequency: 'Еженедельно',
        description: 'Общие работы по всему объекту',
        period: 'Круглогодично',
        objectId: object.id
      }
    });

    if (rooms.length > 0) {
      await prisma.techCard.create({
        data: {
          name: 'Специальные работы в помещении',
          workType: 'Специальные работы',
          frequency: 'Ежемесячно',
          description: 'Специальные работы в конкретном помещении',
          period: 'Зимний период',
          notes: 'Требует специального оборудования',
          objectId: object.id,
          roomId: rooms[0].id
        }
      });
    }

    console.log('✅ Созданы дополнительные техкарты');

    console.log('\n🎉 ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ!');
    console.log('\nСтруктура:');
    console.log(`📍 Объект: ${object.name}`);
    console.log(`  └── 🏗️ Участок: ${site.name}`);
    console.log(`      └── 🏭 Зона: ${zone.name}`);
    console.log(`          └── 👥 Группа: ${roomGroup.name}`);
    console.log(`              └── 🏠 Помещение: ${rooms[0]?.name || 'N/A'}`);
    console.log(`                  ├── 📦 Полы (с техкартой)`);
    console.log(`                  ├── 📦 Стены (с техкартой)`);
    console.log(`                  └── 📦 Окна (с техкартой)`);

  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createHierarchyTestData();
