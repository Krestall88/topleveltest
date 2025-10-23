const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🏢 ДОБАВЛЕНИЕ ООО «ЕДИНЫЕ ТРАНСПОРТНЫЕ ЭНЕРГОСИСТЕМЫ» (ЕТЭС)');
console.log('================================================================');

// Техкарты для ООО «ЕТЭС»
function getETESTechCards() {
  return [
    {
      name: "Ежедневная уборка помещений (площадь 1200 м²)",
      type: "CLEANING",
      description: "Ежедневная уборка помещений общей площадью 1200 м². График работы: 5/2 с 18:00",
      frequency: "DAILY"
    },
    {
      name: "Основная лестница с 9 по 11 этажи",
      type: "CLEANING",
      description: "Ежедневная уборка основной лестницы с 9 по 11 этажи. График работы: 5/2 с 18:00",
      frequency: "DAILY"
    },
    {
      name: "Дополнительная лестница с 9 по 11 этажи",
      type: "CLEANING",
      description: "Уборка дополнительной лестницы с 9 по 11 этажи. 1 раз в месяц",
      frequency: "MONTHLY"
    },
    {
      name: "Входная зона с ул. Молодогвардейская (площадь 71.3 м²)",
      type: "CLEANING",
      description: "Уборка входной зоны с ул. Молодогвардейская, площадь 71.3 м². По графику по нечетным датам в рабочие дни",
      frequency: "WEEKLY"
    },
    {
      name: "Цоколь: медпункт, комната водителей (площадь 28.5 м²)",
      type: "CLEANING",
      description: "Уборка цокольного этажа: медпункт, комната водителей, площадь 28.5 м². По графику по нечетным датам в рабочие дни",
      frequency: "WEEKLY"
    }
  ];
}

async function createETES() {
  try {
    console.log('\n🏗️ Создаем объект ООО «ЕТЭС»...');

    // Получаем admin пользователя
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('Не найден пользователь с ролью ADMIN');
    }

    // Создаем объект
    let dbObject = await prisma.cleaningObject.findFirst({
      where: { name: 'ООО «Единые Транспортные ЭнергоСистемы» (ЕТЭС)' }
    });

    if (!dbObject) {
      dbObject = await prisma.cleaningObject.create({
        data: {
          name: 'ООО «Единые Транспортные ЭнергоСистемы» (ЕТЭС)',
          address: 'г. Самара, ул. Молодогвардейская, 224',
          description: 'Офисное здание, этажи 9-11',
          timezone: 'Europe/Samara',
          workingHours: JSON.stringify({ start: "18:00", end: "22:00" }),
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
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
        name: 'Офисное здание'
      }
    });

    if (!site) {
      site = await prisma.site.create({
        data: {
          name: 'Офисное здание',
          description: 'Офисное здание ООО «ЕТЭС» на ул. Молодогвардейская, 224',
          area: 1300.0, // общая площадь всех зон
          objectId: dbObject.id
        }
      });
      console.log('   ✅ Участок создан');
    }

    // Данные зон
    const zonesData = [
      {
        name: 'Основные помещения (1200 м²)',
        description: 'Основные рабочие помещения офиса',
        area: 1200.0
      },
      {
        name: 'Лестничные марши (9-11 этажи)',
        description: 'Основная и дополнительная лестницы',
        area: 50.0
      },
      {
        name: 'Входная зона (71.3 м²)',
        description: 'Входная зона с ул. Молодогвардейская',
        area: 71.3
      },
      {
        name: 'Цокольный этаж (28.5 м²)',
        description: 'Медпункт и комната водителей',
        area: 28.5
      }
    ];

    let techCardCount = 0;
    const techCards = getETESTechCards();

    for (let i = 0; i < zonesData.length; i++) {
      const zoneData = zonesData[i];
      console.log(`\n🏗️ Обрабатываем: ${zoneData.name}`);

      // Создаем зону
      let zone = await prisma.zone.findFirst({
        where: { 
          siteId: site.id,
          name: zoneData.name
        }
      });

      if (!zone) {
        zone = await prisma.zone.create({
          data: {
            name: zoneData.name,
            description: zoneData.description,
            area: zoneData.area,
            siteId: site.id
          }
        });
      }

      // Создаем группу помещений
      let roomGroup = await prisma.roomGroup.findFirst({
        where: { 
          zoneId: zone.id,
          name: `Группа помещений ${zoneData.name}`
        }
      });

      if (!roomGroup) {
        roomGroup = await prisma.roomGroup.create({
          data: {
            name: `Группа помещений ${zoneData.name}`,
            description: `Основная группа помещений для ${zoneData.name}`,
            area: zoneData.area,
            zoneId: zone.id
          }
        });
      }

      // Создаем помещение
      let room = await prisma.room.findFirst({
        where: { 
          objectId: dbObject.id,
          roomGroupId: roomGroup.id,
          name: zoneData.name
        }
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            name: zoneData.name,
            description: zoneData.description,
            area: zoneData.area,
            objectId: dbObject.id,
            roomGroupId: roomGroup.id
          }
        });
      }

      // Создаем техкарту для этой зоны (если есть соответствующая)
      if (i < techCards.length) {
        const techCard = techCards[i];
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
    }

    // Добавляем оставшуюся техкарту (если есть)
    if (techCards.length > zonesData.length) {
      const lastRoom = await prisma.room.findFirst({
        where: { objectId: dbObject.id },
        orderBy: { createdAt: 'desc' }
      });

      for (let i = zonesData.length; i < techCards.length; i++) {
        const techCard = techCards[i];
        const existingTechCard = await prisma.techCard.findFirst({
          where: {
            roomId: lastRoom.id,
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
              roomId: lastRoom.id
            }
          });
          techCardCount++;
        }
      }
    }

    console.log(`\n   📋 Создано техкарт: ${techCardCount}`);

    return { 
      success: true, 
      objectId: dbObject.id,
      techCardCount,
      objectName: dbObject.name,
      zonesCount: zonesData.length
    };

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    const result = await createETES();
    
    if (result.success) {
      console.log('\n================================================================');
      console.log('🎉 ООО «ЕТЭС» УСПЕШНО ДОБАВЛЕНО!');
      console.log(`📊 Статистика:`);
      console.log(`   📋 Техкарт создано: ${result.techCardCount}`);
      console.log(`   🏗️ Зон создано: ${result.zonesCount}`);
      console.log(`   🏢 Объект: ${result.objectName}`);
      console.log(`   🏢 Тип: Офисное здание`);
      console.log(`   ⏰ График: 5/2 с 18:00`);
      console.log(`   📍 Этажи: 9-11`);
      console.log('\n🚀 Объект готов к назначению менеджера и созданию автоматических чек-листов');
    } else {
      console.log('\n❌ ОШИБКА ПРИ ДОБАВЛЕНИИ ООО «ЕТЭС»');
      console.log('Детали:', result.error);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
