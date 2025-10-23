const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('🌳 ДОБАВЛЕНИЕ ООО «ИНКАТЕХ» - ТЕРРИТОРИЯ (ВНЕШНЯЯ УБОРКА)');
console.log('===========================================================');

// Техкарты для территории
function getTerritoryTechCards() {
  return [
    {
      name: "Уборка пыли и мусора с асфальтовой площадки",
      type: "CLEANING",
      description: "Уборка пыли и мусора с асфальтовой площадки, общая площадь 5688 м². 1 раз в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка от пыли, мусора и листвы с внутриплощадочных автодорог",
      type: "CLEANING",
      description: "Уборка от пыли, мусора и листвы с внутриплощадочных автодорог, общая площадь 9189,9 м². 1 раз в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка площадки для автотранспорта",
      type: "CLEANING",
      description: "Уборка от пыли, мусора и листвы с площадки для автотранспорта, общая площадь 9969 м². 1 раз в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка площадки для стоянки грузового автотранспорта",
      type: "CLEANING",
      description: "Уборка от пыли, мусора и листвы с площадки для стоянки грузового автотранспорта, общая площадь 6366 м². 1 раз в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка площадки для стоянки легкового автотранспорта",
      type: "CLEANING",
      description: "Уборка от пыли, мусора и листвы с площадки для стоянки легкового автотранспорта, общая площадь 533,8 м². 1 раз в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка мусора с площадки для стоянки",
      type: "CLEANING",
      description: "Уборка мусора с площадки для стоянки (подготовка песчаная толщина 300мм; подготовка щебеночная 150м). Один раз в месяц. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "MONTHLY"
    },
    {
      name: "Уборка спортивной площадки",
      type: "CLEANING",
      description: "Уборка от пыли, листьев со спортивной площадки, общая площадь 1500 м². Один раз в месяц. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "MONTHLY"
    },
    {
      name: "Уборка мусора с территории прилегания цех-автодороги (газон)",
      type: "CLEANING",
      description: "Уборка мусора с территории прилегания цех-автодороги (газон). 2 раза в месяц. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Уборка тротуаров от пыли, мусора, снега и наледи",
      type: "CLEANING",
      description: "Уборка от пыли, мусора, снега и наледи с тротуаров (в числе внутриплощадочных дорог 743 м тротуаров). 1 раз в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    }
  ];
}

// Техкарты для малых зданий
function getSmallBuildingsTechCards() {
  return [
    {
      name: "Влажная уборка пола с дезинфекцией",
      type: "CLEANING",
      description: "Влажная уборка пола с дезинфекцией. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    },
    {
      name: "Влажная уборка подоконников и мебели",
      type: "CLEANING",
      description: "Влажная уборка подоконников и мебели. 1-2 раза в неделю. График: 5/2 Пн-Чт с 8:00 до 17:00, Пт с 8:00 до 16:00",
      frequency: "WEEKLY"
    }
  ];
}

async function createInkatechTerritory() {
  try {
    console.log('\n🏗️ Добавляем территорию к объекту ООО «ИНКАТЕХ»...');

    // Получаем существующий объект
    const dbObject = await prisma.cleaningObject.findFirst({
      where: { name: 'ООО «ИНКАТЕХ»' }
    });

    if (!dbObject) {
      throw new Error('Объект ООО «ИНКАТЕХ» не найден. Сначала запустите add-inkatech-main.js');
    }

    // Создаем участок для территории
    let territorySite = await prisma.site.findFirst({
      where: { 
        objectId: dbObject.id,
        name: 'Внешняя территория'
      }
    });

    if (!territorySite) {
      territorySite = await prisma.site.create({
        data: {
          name: 'Внешняя территория',
          description: 'Внешняя территория и малые здания ООО «ИНКАТЕХ»',
          area: 35000.0, // общая площадь территории
          objectId: dbObject.id
        }
      });
      console.log('   ✅ Участок территории создан');
    }

    // Данные территориальных зон
    const territoryZones = [
      {
        name: 'Асфальтовые площадки и дороги',
        description: 'Асфальтовые площадки, внутриплощадочные дороги',
        area: 25000.0,
        getTechCards: getTerritoryTechCards
      },
      {
        name: 'Парковочные зоны',
        description: 'Площадки для стоянки автотранспорта',
        area: 8000.0,
        getTechCards: () => [
          {
            name: "Уборка парковочных зон",
            type: "CLEANING",
            description: "Комплексная уборка всех парковочных зон от пыли, мусора и листвы. 1 раз в неделю",
            frequency: "WEEKLY"
          }
        ]
      },
      {
        name: 'Спортивная и рекреационная зона',
        description: 'Спортивная площадка и зоны отдыха',
        area: 2000.0,
        getTechCards: () => [
          {
            name: "Уборка спортивной и рекреационной зоны",
            type: "CLEANING",
            description: "Уборка спортивной площадки и зон отдыха от листьев и мусора. 1 раз в месяц",
            frequency: "MONTHLY"
          }
        ]
      }
    ];

    // Данные малых зданий
    const smallBuildings = [
      {
        name: 'Весовая (16,6 м²)',
        description: 'Здание весовой',
        area: 16.6
      },
      {
        name: 'Мойка (38,4 м²)',
        description: 'Здание мойки',
        area: 38.4
      },
      {
        name: 'Вагончик стропольщиков центральный склад (18 м²)',
        description: 'Вагончик стропольщиков',
        area: 18.0
      },
      {
        name: 'Вагончик начальника центрального склада (21,6 м²)',
        description: 'Вагончик начальника склада',
        area: 21.6
      },
      {
        name: 'Вагончик уборщиков территории (13,2 м²)',
        description: 'Вагончик уборщиков',
        area: 13.2
      },
      {
        name: 'Здание хозяйственной службы (22,5 м²)',
        description: 'Здание хозяйственной службы',
        area: 22.5
      },
      {
        name: 'Цех подготовки шихты (835 м²)',
        description: 'Цех подготовки шихты',
        area: 835.0
      },
      {
        name: 'АБК автобазы (202,62 м²)',
        description: 'Административно-бытовой комплекс автобазы',
        area: 202.62
      },
      {
        name: 'Проходная автобазы (7 м²)',
        description: 'Проходная автобазы',
        area: 7.0
      },
      {
        name: 'Тарный участок комната отдыха (32 м²)',
        description: 'Комната отдыха тарного участка',
        area: 32.0
      },
      {
        name: 'Комбайновый цех (124,54 м²)',
        description: 'Комбайновый цех',
        area: 124.54
      }
    ];

    let techCardCount = 0;

    // Обрабатываем территориальные зоны
    for (const zoneData of territoryZones) {
      console.log(`\n🌳 Обрабатываем территориальную зону: ${zoneData.name}`);

      // Создаем зону
      let zone = await prisma.zone.findFirst({
        where: { 
          siteId: territorySite.id,
          name: zoneData.name
        }
      });

      if (!zone) {
        zone = await prisma.zone.create({
          data: {
            name: zoneData.name,
            description: zoneData.description,
            area: zoneData.area,
            siteId: territorySite.id
          }
        });
      }

      // Создаем группу помещений
      let roomGroup = await prisma.roomGroup.findFirst({
        where: { 
          zoneId: zone.id,
          name: `Группа ${zoneData.name}`
        }
      });

      if (!roomGroup) {
        roomGroup = await prisma.roomGroup.create({
          data: {
            name: `Группа ${zoneData.name}`,
            description: `Основная группа для ${zoneData.name}`,
            area: zoneData.area,
            zoneId: zone.id
          }
        });
      }

      // Создаем помещение (территорию)
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

      // Создаем техкарты
      const techCards = zoneData.getTechCards();
      
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
    }

    // Обрабатываем малые здания
    console.log(`\n🏠 Обрабатываем малые здания...`);
    
    // Создаем зону для малых зданий
    let smallBuildingsZone = await prisma.zone.findFirst({
      where: { 
        siteId: territorySite.id,
        name: 'Малые здания и сооружения'
      }
    });

    if (!smallBuildingsZone) {
      smallBuildingsZone = await prisma.zone.create({
        data: {
          name: 'Малые здания и сооружения',
          description: 'Вагончики, весовая, мойка и другие малые здания',
          area: 1300.0,
          siteId: territorySite.id
        }
      });
    }

    for (const buildingData of smallBuildings) {
      console.log(`   🏠 ${buildingData.name}`);

      // Создаем группу помещений
      let roomGroup = await prisma.roomGroup.findFirst({
        where: { 
          zoneId: smallBuildingsZone.id,
          name: `Группа ${buildingData.name}`
        }
      });

      if (!roomGroup) {
        roomGroup = await prisma.roomGroup.create({
          data: {
            name: `Группа ${buildingData.name}`,
            description: `Группа для ${buildingData.name}`,
            area: buildingData.area,
            zoneId: smallBuildingsZone.id
          }
        });
      }

      // Создаем помещение
      let room = await prisma.room.findFirst({
        where: { 
          objectId: dbObject.id,
          roomGroupId: roomGroup.id,
          name: buildingData.name
        }
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            name: buildingData.name,
            description: buildingData.description,
            area: buildingData.area,
            objectId: dbObject.id,
            roomGroupId: roomGroup.id
          }
        });
      }

      // Создаем техкарты для малых зданий
      const techCards = getSmallBuildingsTechCards();
      
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
    }

    console.log(`\n   📋 Создано техкарт для территории: ${techCardCount}`);

    return { 
      success: true, 
      objectId: dbObject.id,
      techCardCount,
      objectName: dbObject.name,
      territoryZonesCount: territoryZones.length,
      smallBuildingsCount: smallBuildings.length
    };

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    const result = await createInkatechTerritory();
    
    if (result.success) {
      console.log('\n===========================================================');
      console.log('🎉 ООО «ИНКАТЕХ» ТЕРРИТОРИЯ УСПЕШНО ДОБАВЛЕНА!');
      console.log(`📊 Статистика территории:`);
      console.log(`   📋 Техкарт создано: ${result.techCardCount}`);
      console.log(`   🌳 Территориальных зон: ${result.territoryZonesCount}`);
      console.log(`   🏠 Малых зданий: ${result.smallBuildingsCount}`);
      console.log(`   🏢 Объект: ${result.objectName}`);
      console.log(`   🌍 Тип: Внешняя территория и малые здания`);
      console.log(`   ⏰ График: 5/2 с 8:00 до 17:00`);
      console.log('\n🚀 Территория готова к назначению менеджера и созданию автоматических чек-листов');
    } else {
      console.log('\n❌ ОШИБКА ПРИ ДОБАВЛЕНИИ ТЕРРИТОРИИ ООО «ИНКАТЕХ»');
      console.log('Детали:', result.error);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
