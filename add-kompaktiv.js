const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🏢 ДОБАВЛЕНИЕ КОМПАКТИВ (ОФИСНОЕ ЗДАНИЕ)');
console.log('========================================');

// Техкарты для офисного здания КОМПАКТИВ
function getKompaktivTechCards() {
  return [
    {
      name: "Уборка коридоров",
      type: "CLEANING",
      description: "Уборка коридоров ежедневно и по мере необходимости. 5 дней в неделю",
      frequency: "DAILY"
    },
    {
      name: "Уборка санузлов",
      type: "CLEANING",
      description: "Уборка санузлов ежедневно и по мере необходимости. 5 дней в неделю",
      frequency: "DAILY"
    },
    {
      name: "Влажная уборка перехода между этажами",
      type: "CLEANING",
      description: "Влажная уборка перехода между этажами ежедневно и по мере необходимости. 5 дней в неделю",
      frequency: "DAILY"
    },
    {
      name: "Уборка лифтовых кабин",
      type: "CLEANING",
      description: "Уборка лифтовых кабин ежедневно и по мере необходимости. 5 дней в неделю",
      frequency: "DAILY"
    },
    {
      name: "Влажная уборка 1 этажа",
      type: "CLEANING",
      description: "Влажная уборка 1 этажа ежедневно и по мере необходимости. 5 дней в неделю",
      frequency: "DAILY"
    },
    {
      name: "Уборка комнаты охраны и персонала",
      type: "CLEANING",
      description: "Уборка комнаты охраны и персонала. 2 раза в неделю",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка кабинета директора",
      type: "CLEANING",
      description: "Уборка кабинета директора. 1 раз в день пять раз в неделю",
      frequency: "DAILY"
    }
  ];
}

async function createKompaktiv() {
  try {
    console.log('\n🏗️ Создаем объект КОМПАКТИВ...');

    // Получаем admin пользователя
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('Не найден пользователь с ролью ADMIN');
    }

    // Создаем объект
    let dbObject = await prisma.cleaningObject.findFirst({
      where: { name: 'КОМПАКТИВ' }
    });

    if (!dbObject) {
      dbObject = await prisma.cleaningObject.create({
        data: {
          name: 'КОМПАКТИВ',
          address: 'г. Самара, Московское шоссе 4, стр. 9',
          description: 'Многоэтажное офисное здание с лифтами',
          timezone: 'Europe/Samara',
          workingHours: JSON.stringify({ start: "08:00", end: "18:00" }),
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
          description: 'Многоэтажное офисное здание КОМПАКТИВ',
          area: 2000.0, // примерная площадь
          objectId: dbObject.id
        }
      });
      console.log('   ✅ Участок создан');
    }

    // Данные зон офисного здания
    const zonesData = [
      {
        name: '1 этаж',
        description: 'Первый этаж здания с входной зоной',
        area: 400.0
      },
      {
        name: 'Коридоры и переходы',
        description: 'Коридоры и переходы между этажами',
        area: 300.0
      },
      {
        name: 'Санузлы',
        description: 'Санузлы на всех этажах',
        area: 100.0
      },
      {
        name: 'Лифтовые зоны',
        description: 'Лифтовые кабины и холлы',
        area: 150.0
      },
      {
        name: 'Служебные помещения',
        description: 'Комната охраны, персонала, кабинет директора',
        area: 200.0
      }
    ];

    let techCardCount = 0;
    const techCards = getKompaktivTechCards();

    // Создаем зону для всех работ
    console.log(`\n🏗️ Создаем общую зону для всех работ`);

    let mainZone = await prisma.zone.findFirst({
      where: { 
        siteId: site.id,
        name: 'Общие зоны уборки'
      }
    });

    if (!mainZone) {
      mainZone = await prisma.zone.create({
        data: {
          name: 'Общие зоны уборки',
          description: 'Все зоны офисного здания для уборки',
          area: 2000.0,
          siteId: site.id
        }
      });
    }

    // Создаем группу помещений
    let roomGroup = await prisma.roomGroup.findFirst({
      where: { 
        zoneId: mainZone.id,
        name: 'Группа помещений офисного здания'
      }
    });

    if (!roomGroup) {
      roomGroup = await prisma.roomGroup.create({
        data: {
          name: 'Группа помещений офисного здания',
          description: 'Основная группа помещений офисного здания',
          area: 2000.0,
          zoneId: mainZone.id
        }
      });
    }

    // Создаем помещение
    let room = await prisma.room.findFirst({
      where: { 
        objectId: dbObject.id,
        roomGroupId: roomGroup.id,
        name: 'Офисное здание КОМПАКТИВ'
      }
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          name: 'Офисное здание КОМПАКТИВ',
          description: 'Многоэтажное офисное здание с лифтами',
          area: 2000.0,
          objectId: dbObject.id,
          roomGroupId: roomGroup.id
        }
      });
    }

    // Создаем все техкарты для этого помещения
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
    const result = await createKompaktiv();
    
    if (result.success) {
      console.log('\n========================================');
      console.log('🎉 КОМПАКТИВ УСПЕШНО ДОБАВЛЕН!');
      console.log(`📊 Статистика:`);
      console.log(`   📋 Техкарт создано: ${result.techCardCount}`);
      console.log(`   🏢 Объект: ${result.objectName}`);
      console.log(`   🏢 Тип: Многоэтажное офисное здание`);
      console.log(`   🛗 Особенности: с лифтами`);
      console.log(`   ⏰ График: 5 дней в неделю с 8:00 до 18:00`);
      console.log(`   📍 Адрес: г. Самара, Московское шоссе 4, стр. 9`);
      console.log('\n🚀 Объект готов к назначению менеджера и созданию автоматических чек-листов');
    } else {
      console.log('\n❌ ОШИБКА ПРИ ДОБАВЛЕНИИ КОМПАКТИВ');
      console.log('Детали:', result.error);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
