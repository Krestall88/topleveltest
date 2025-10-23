const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🌳 ДОБАВЛЕНИЕ МБУ «ЛОПАТИНСКОЕ» - УЛИЧНАЯ УБОРКА');
console.log('=======================================================');

// Техкарты для уличной уборки МБУ «Лопатинское»
function getStreetCleaningTechCards() {
  return [
    {
      name: "Подметание тротуаров",
      type: "CLEANING",
      description: "Ежедневное подметание тротуаров. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Уборка мусора с тротуаров",
      type: "CLEANING", 
      description: "Ежедневная уборка мусора с тротуаров. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Очистка мусорных корзин",
      type: "CLEANING",
      description: "Очистка мусорных корзин. 2 раза в день",
      frequency: "DAILY"
    },
    {
      name: "Прополка травы в швах брусчатки",
      type: "CLEANING",
      description: "Прополка травы в швах брусчатки. 1 раз в неделю",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка песка с детской площадки",
      type: "CLEANING",
      description: "Уборка песка с детской площадки. 1 раз в неделю",
      frequency: "WEEKLY"
    },
    {
      name: "Протирка лавочек",
      type: "CLEANING",
      description: "Ежедневная протирка лавочек. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Уборка мусора с газона",
      type: "CLEANING",
      description: "Ежедневная уборка мусора с газона. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Уборка чернозема с тротуара",
      type: "CLEANING",
      description: "Ежедневная уборка чернозема с тротуара. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Уборка стадиона и возле него",
      type: "CLEANING",
      description: "Уборка стадиона и прилегающей территории. 3 раза в неделю",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка спортивной площадки",
      type: "CLEANING",
      description: "Ежедневная уборка спортивной площадки. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Уборка гравия на детской игровой",
      type: "CLEANING",
      description: "Ежедневная уборка гравия на детской игровой площадке. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Очистка лестниц от грязи",
      type: "CLEANING",
      description: "Ежедневная очистка лестниц от грязи. Рабочий график: 7/0 с 8:00 до 20:00",
      frequency: "DAILY"
    },
    {
      name: "Межсезонная уборка газонов (вычесывание газона)",
      type: "CLEANING",
      description: "Межсезонная уборка газонов, вычесывание газона. 2 раза в неделю",
      frequency: "WEEKLY"
    }
  ];
}

async function createMBULopatinskoe() {
  try {
    console.log('\n🏗️ Создаем объект МБУ «Лопатинское»...');

    // Получаем admin пользователя
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('Не найден пользователь с ролью ADMIN');
    }

    // Создаем объект
    let dbObject = await prisma.cleaningObject.findFirst({
      where: { name: 'МБУ «Лопатинское»' }
    });

    if (!dbObject) {
      dbObject = await prisma.cleaningObject.create({
        data: {
          name: 'МБУ «Лопатинское»',
          address: 'район Волжский Самарской области, Набережная мкр. "Южный город"',
          description: 'Муниципальное бюджетное учреждение по благоустройству территории',
          timezone: 'Europe/Samara',
          workingHours: JSON.stringify({ start: "08:00", end: "20:00" }),
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
          autoChecklistEnabled: true,
          creatorId: adminUser.id
        }
      });
      console.log('   ✅ Объект создан');
    } else {
      console.log('   ℹ️ Объект уже существует');
    }

    // Создаем участок
    let site = await prisma.site.findFirst({
      where: { 
        objectId: dbObject.id,
        name: 'Территория благоустройства'
      }
    });

    if (!site) {
      site = await prisma.site.create({
        data: {
          name: 'Территория благоустройства',
          description: 'Территория для уличной уборки и благоустройства',
          area: 50000.0, // примерная площадь территории
          objectId: dbObject.id
        }
      });
      console.log('   ✅ Участок создан');
    }

    // Создаем зону
    let zone = await prisma.zone.findFirst({
      where: { 
        siteId: site.id,
        name: 'Зона уличной уборки'
      }
    });

    if (!zone) {
      zone = await prisma.zone.create({
        data: {
          name: 'Зона уличной уборки',
          description: 'Основная зона для уличной уборки и благоустройства территории',
          area: 50000.0,
          siteId: site.id
        }
      });
      console.log('   ✅ Зона создана');
    }

    // Создаем группу помещений
    let roomGroup = await prisma.roomGroup.findFirst({
      where: { 
        zoneId: zone.id,
        name: 'Уличные объекты'
      }
    });

    if (!roomGroup) {
      roomGroup = await prisma.roomGroup.create({
        data: {
          name: 'Уличные объекты',
          description: 'Группа уличных объектов для уборки',
          area: 50000.0,
          zoneId: zone.id
        }
      });
      console.log('   ✅ Группа помещений создана');
    }

    // Создаем помещение (территорию)
    let room = await prisma.room.findFirst({
      where: { 
        objectId: dbObject.id,
        roomGroupId: roomGroup.id,
        name: 'Уличная территория'
      }
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          name: 'Уличная территория',
          description: 'Территория для уличной уборки: тротуары, газоны, детские и спортивные площадки',
          area: 50000.0,
          objectId: dbObject.id,
          roomGroupId: roomGroup.id
        }
      });
      console.log('   ✅ Помещение (территория) создано');
    }

    // Создаем техкарты
    const techCards = getStreetCleaningTechCards();
    let techCardCount = 0;
    
    for (const techCard of techCards) {
      const existingTechCard = await prisma.techCard.findFirst({
        where: {
          roomId: room.id,
          name: techCard.name
        }
      });

      if (!existingTechCard) {
        await prisma.techCard.create({
          data: {
            name: techCard.name,
            workType: techCard.type,
            frequency: techCard.frequency,
            description: techCard.description,
            objectId: dbObject.id,
            roomId: room.id
          }
        });
        techCardCount++;
      }
    }

    console.log(`   📋 Создано техкарт: ${techCardCount}`);

    return { 
      success: true, 
      objectId: dbObject.id,
      techCardCount,
      objectName: dbObject.name
    };

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    const result = await createMBULopatinskoe();
    
    if (result.success) {
      console.log('\n=======================================================');
      console.log('🎉 МБУ «ЛОПАТИНСКОЕ» УСПЕШНО ДОБАВЛЕНО!');
      console.log(`📊 Статистика:`);
      console.log(`   📋 Техкарт создано: ${result.techCardCount}`);
      console.log(`   🏢 Объект: ${result.objectName}`);
      console.log(`   🌳 Тип: Уличная уборка и благоустройство`);
      console.log(`   ⏰ График: 7/0 с 8:00 до 20:00`);
      console.log('\n🚀 Объект готов к назначению менеджера и созданию автоматических чек-листов');
    } else {
      console.log('\n❌ ОШИБКА ПРИ ДОБАВЛЕНИИ МБУ «ЛОПАТИНСКОЕ»');
      console.log('Детали:', result.error);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
