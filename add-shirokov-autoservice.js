const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🚗 ДОБАВЛЕНИЕ ИП ШИРОКОВ ДМИТРИЙ ВЛАДИМИРОВИЧ (АВТОСЕРВИС)');
console.log('==========================================================');

// Техкарты для автосервиса
function getAutoserviceTechCards() {
  return [
    {
      name: "Протирка стеллажей по требованию, мытье зала, туалета (2 шт.) и кабинета (1 этаж)",
      type: "CLEANING",
      description: "Протирка стеллажей по требованию, мытье зала, туалета (2 шт.) и кабинета на 1 этаже. 2 раза в неделю (вечернее время)",
      frequency: "WEEKLY"
    },
    {
      name: "Мытье туалета, комнаты отдыха и душевой (сервисная зона)",
      type: "CLEANING",
      description: "Мытье туалета, комнаты отдыха и душевой в сервисной зоне. 2 раза в неделю (вечернее время)",
      frequency: "WEEKLY"
    },
    {
      name: "Мытье туалета, лестниц, коридора, кабинета (2 этаж)",
      type: "CLEANING",
      description: "Мытье туалета, лестниц, коридора, кабинета на 2 этаже. 2 раза в неделю (вечернее время)",
      frequency: "WEEKLY"
    }
  ];
}

async function createShirokovAutoservice() {
  try {
    console.log('\n🏗️ Создаем объект ИП Широков (автосервис)...');

    // Получаем admin пользователя
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      throw new Error('Не найден пользователь с ролью ADMIN');
    }

    // Создаем объект
    let dbObject = await prisma.cleaningObject.findFirst({
      where: { name: 'ИП Широков Дмитрий Владимирович (автосервис)' }
    });

    if (!dbObject) {
      dbObject = await prisma.cleaningObject.create({
        data: {
          name: 'ИП Широков Дмитрий Владимирович (автосервис)',
          address: 'пос. Придорожный, мкр. Южный город, ул. Изумрудная, 2А',
          description: 'Автосервис, площадь 245 м²',
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
        name: 'Здание автосервиса'
      }
    });

    if (!site) {
      site = await prisma.site.create({
        data: {
          name: 'Здание автосервиса',
          description: 'Двухэтажное здание автосервиса с сервисной зоной',
          area: 245.0,
          objectId: dbObject.id
        }
      });
      console.log('   ✅ Участок создан');
    }

    // Данные зон автосервиса
    const zonesData = [
      {
        name: '1 этаж',
        description: 'Зал, туалеты (2 шт.), кабинет, стеллажи',
        area: 120.0
      },
      {
        name: 'Сервисная зона',
        description: 'Туалет, комната отдыха, душевая',
        area: 75.0
      },
      {
        name: '2 этаж',
        description: 'Туалет, лестницы, коридор, кабинет',
        area: 50.0
      }
    ];

    let techCardCount = 0;
    const techCards = getAutoserviceTechCards();

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

      // Создаем техкарту для этой зоны
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
    const result = await createShirokovAutoservice();
    
    if (result.success) {
      console.log('\n==========================================================');
      console.log('🎉 ИП ШИРОКОВ (АВТОСЕРВИС) УСПЕШНО ДОБАВЛЕН!');
      console.log(`📊 Статистика:`);
      console.log(`   📋 Техкарт создано: ${result.techCardCount}`);
      console.log(`   🏗️ Зон создано: ${result.zonesCount}`);
      console.log(`   🏢 Объект: ${result.objectName}`);
      console.log(`   🚗 Тип: Автосервис`);
      console.log(`   📐 Площадь: 245 м²`);
      console.log(`   ⏰ График: 2 раза в неделю (вечернее время)`);
      console.log(`   📍 Адрес: пос. Придорожный, мкр. Южный город`);
      console.log('\n🚀 Объект готов к назначению менеджера и созданию автоматических чек-листов');
    } else {
      console.log('\n❌ ОШИБКА ПРИ ДОБАВЛЕНИИ ИП ШИРОКОВ (АВТОСЕРВИС)');
      console.log('Детали:', result.error);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
