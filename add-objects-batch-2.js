const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addObjectsBatch2() {
  try {
    console.log('🏗️ ДОБАВЛЕНИЕ ОБЪЕКТОВ - ПАРТИЯ 2');
    console.log('='.repeat(80));

    // Получаем ID админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      throw new Error('Админ не найден');
    }

    // 1. ООО фирма «Нектар»
    await createNektarObject(admin.id);

    // 2. ООО «УК «Амонд-ЖилКомСервис»
    await createAmondObject(admin.id);

    console.log('='.repeat(80));
    console.log('🎉 ПАРТИЯ 2 УСПЕШНО ДОБАВЛЕНА!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createNektarObject(adminId) {
  console.log('\n🏢 Создаем объект: ООО фирма «Нектар»');

  // Проверяем, существует ли объект
  let dbObject = await prisma.cleaningObject.findFirst({
    where: { name: 'ООО фирма «Нектар»' }
  });

  if (!dbObject) {
    dbObject = await prisma.cleaningObject.create({
      data: {
        name: 'ООО фирма «Нектар»',
        address: 'г. Самара, ул. Мальцева, 9',
        creatorId: adminId,
        timezone: 'Europe/Samara',
        workingHours: { start: '08:00', end: '20:00' },
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        autoChecklistEnabled: true
      }
    });
    console.log('   ✅ Объект создан');
  } else {
    console.log('   📝 Объект уже существует');
  }

  // Создаем участок
  let site = await prisma.site.findFirst({
    where: { 
      objectId: dbObject.id,
      name: 'Основная территория'
    }
  });

  if (!site) {
    site = await prisma.site.create({
      data: {
        name: 'Основная территория',
        objectId: dbObject.id
      }
    });
  }

  // Создаем зоны
  const zones = [
    { name: 'Зона №1 (7000м²)', description: 'От выездного шлагбаума до выезда (6500м²) Ж/д путь №3 (500м²)' },
    { name: 'Зона №2 (650м²)', description: 'Стоянка Завода' },
    { name: 'Зона №3 (1700м²)', description: 'Эстакада Корпус №2 Между корпусами №1 и №2' },
    { name: 'Зона №4 (1700м²)', description: 'Эстакада Корпус №3, Между корпусами №2 и №3' },
    { name: 'Зона №5 (1700м²)', description: 'Эстакада Корпус №4 Между корпусами №3 и №4' },
    { name: 'Зона №6 (1200м²)', description: 'Контейнерная площадка' },
    { name: 'Внутренние помещения', description: 'Уборка внутренних помещений (3000 м²)' }
  ];

  let techCardCount = 0;

  for (const zoneData of zones) {
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
          siteId: site.id
        }
      });
    }

    // Создаем группу помещений для каждой зоны
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
          zoneId: zone.id
        }
      });
    }

    // Создаем помещение
    let room = await prisma.room.findFirst({
      where: { 
        roomGroupId: roomGroup.id,
        name: zoneData.name
      }
    });

    if (!room) {
      const area = extractArea(zoneData.name);
      room = await prisma.room.create({
        data: {
          name: zoneData.name,
          area: area,
          objectId: dbObject.id,
          roomGroupId: roomGroup.id
        }
      });
    }

    // Создаем техкарты в зависимости от зоны
    const techCards = getTechCardsForZone(zoneData.name);
    
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

  console.log(`   📋 Создано техкарт: ${techCardCount}`);
}

async function createAmondObject(adminId) {
  console.log('\n🏢 Создаем объект: ООО «УК «Амонд-ЖилКомСервис»');

  // Проверяем, существует ли объект
  let dbObject = await prisma.cleaningObject.findFirst({
    where: { name: 'ООО «УК «Амонд-ЖилКомСервис»' }
  });

  if (!dbObject) {
    dbObject = await prisma.cleaningObject.create({
      data: {
        name: 'ООО «УК «Амонд-ЖилКомСервис»',
        address: 'Адрес не указан', // В данных адрес не указан
        creatorId: adminId,
        timezone: 'Europe/Samara',
        workingHours: { start: '08:00', end: '17:00' },
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
        autoChecklistEnabled: true
      }
    });
    console.log('   ✅ Объект создан');
  } else {
    console.log('   📝 Объект уже существует');
  }

  // Создаем участок
  let site = await prisma.site.findFirst({
    where: { 
      objectId: dbObject.id,
      name: 'Жилой комплекс'
    }
  });

  if (!site) {
    site = await prisma.site.create({
      data: {
        name: 'Жилой комплекс',
        objectId: dbObject.id
      }
    });
  }

  // Создаем зоны
  const zones = [
    { name: 'Места общего пользования', description: 'Уборка мест общего пользования: 5/2 (суббота, воскресенье вых.)' },
    { name: 'Придомовая территория', description: 'Уборка придомовой (прилегающей к дому) территории: 5/2 (суббота, воскресенье вых.)' }
  ];

  let techCardCount = 0;

  for (const zoneData of zones) {
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
          siteId: site.id
        }
      });
    }

    // Создаем группу помещений для каждой зоны
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
          zoneId: zone.id
        }
      });
    }

    // Создаем помещение
    let room = await prisma.room.findFirst({
      where: { 
        roomGroupId: roomGroup.id,
        name: zoneData.name
      }
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          name: zoneData.name,
          area: 0, // Площадь не указана
          objectId: dbObject.id,
          roomGroupId: roomGroup.id
        }
      });
    }

    // Создаем техкарты в зависимости от зоны
    const techCards = getAmondTechCards(zoneData.name);
    
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

  console.log(`   📋 Создано техкарт: ${techCardCount}`);
}

function extractArea(zoneName) {
  const match = zoneName.match(/(\d+)м²/);
  return match ? parseInt(match[1]) : 0;
}

function getTechCardsForZone(zoneName) {
  if (zoneName.includes('Зона №1')) {
    return [
      { name: 'Подметание мелкого мусора', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно. График работы дворников 5/2 с понедельника по пятницу (выходной Сб., Вс.) 1 чел. с 8.00 до 17.00, 2 чел. с 13.00 до 20.00' },
      { name: 'Уборка мелкого мусора', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно. По всем услугам, кроме газонов отсутствие: пыли, мусора в летний период, снега (более 5 см) и наледи в зимний период.' },
      { name: 'Уборка снега и льда в зимний период', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости. Со сдвиганием на место, предоставляемое Заказчиком. Вывоз снега с территории осуществляется силами Заказчика.' },
      { name: 'Стрижка растений на Ж/Д путях', type: 'MAINTENANCE', frequency: 'AS_NEEDED', description: 'По мере необходимости с применением механизированного оборудования (предоставляет Заказчик)' }
    ];
  }
  
  if (zoneName.includes('Зона №2')) {
    return [
      { name: 'Подметание', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно. Стоянка Завода 650м²' },
      { name: 'Уборка мелкого мусора', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно' },
      { name: 'Уборка мелкого мусора после строительных работ', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости (не габаритного)' },
      { name: 'Уборка снега и льда в зимний период', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости со сдвиганием на место, предоставляемое Заказчиком' },
      { name: 'Уборка урн и замена пакетов', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости (но не более 2х раз в день). Пакеты предоставляет Заказчик' }
    ];
  }

  if (zoneName.includes('Зона №3') || zoneName.includes('Зона №4') || zoneName.includes('№5')) {
    return [
      { name: 'Подметание', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно' },
      { name: 'Уборка мелкого мусора', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно' },
      { name: 'Уборка мусора после строительных работ', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости (не габаритного)' },
      { name: 'Уборка урн и замена мусорных пакетов', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости (но не более 2х раз в день). Пакеты предоставляет Заказчик' },
      { name: 'Уборка и складирование палет', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По запросу. Складирование в зону утилизации' },
      { name: 'Уборка снега и льда в зимний период', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости со сдвиганием на место, предоставляемое Заказчиком' },
      { name: 'Посыпка территории песком', type: 'MAINTENANCE', frequency: 'DAILY', description: '1 раз в сутки. Песком или песчано-соляной смесью (предоставляет Заказчик)' }
    ];
  }

  if (zoneName.includes('Зона №6')) {
    return [
      { name: 'Подметание', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно. Контейнерная площадка' },
      { name: 'Уборка мелкого мусора', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно' },
      { name: 'Уборка мелкого мусора после строительных работ', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости (не габаритного)' },
      { name: 'Уборка снега и льда в зимний период', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости со сдвиганием на место, предоставляемое Заказчиком' },
      { name: 'Поддержание чистоты вокруг контейнерной площадки', type: 'CLEANING', frequency: 'DAILY', description: 'В течение дня' }
    ];
  }

  if (zoneName.includes('Внутренние помещения')) {
    return [
      { name: 'Сухая и влажная уборка складского помещения', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно 1 раз в день. Напольное покрытие складского помещения' },
      { name: 'Уборка зоны погрузки-разгрузки', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно 1 раз в день. Сухая уборка, влажная уборка пола машинным и ручным способом' },
      { name: 'Вынос мусора', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно 1 раз в день. Мусорные корзины' },
      { name: 'Сухая и влажная уборка напольного покрытия', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно 1 раз в день' },
      { name: 'Протирка пыли с мебели', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно 1 раз в день. По мере освобождения и по договоренности с заказчиком, локально' },
      { name: 'Уборка санузла', type: 'CLEANING', frequency: 'DAILY', description: 'Ежедневно 1 раз в день. Влажная уборка пола, раковин, унитаза, дверей, стен до 1,8м, вынос мусора' },
      { name: 'Протирание окон', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По необходимости' }
    ];
  }

  return [];
}

function getAmondTechCards(zoneName) {
  if (zoneName.includes('Места общего пользования')) {
    return [
      { name: 'Мытье коридоров и квартирных площадок', type: 'CLEANING', frequency: 'TWICE_MONTHLY', description: '2 раза в месяц' },
      { name: 'Подметание коридоров и квартирных площадок', type: 'CLEANING', frequency: 'TWICE_MONTHLY', description: '2 раза в месяц' },
      { name: 'Подметание лестничных площадок и маршей', type: 'CLEANING', frequency: 'TWICE_MONTHLY', description: '2 раза в месяц. Включая переходные лоджии' },
      { name: 'Мытье лестничных площадок и маршей', type: 'CLEANING', frequency: 'TWICE_MONTHLY', description: '2 раза в месяц (в теплый период). Включая переходные лоджии' },
      { name: 'Мытье лифта', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки. Мытье пола, кабины, стен, дверей, зеркал лифта' },
      { name: 'Мытье 1 этажа', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки. Входная группа, лифтовая площадка' },
      { name: 'Влажная протирка элементов', type: 'CLEANING', frequency: 'MONTHLY', description: '1 раз в месяц. Подоконники, решетки, перила, шкафы, почтовые ящики, плафоны' }
    ];
  }

  if (zoneName.includes('Придомовая территория')) {
    return [
      { name: 'Уборка контейнерных площадок', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки' },
      { name: 'Уборка придомовой территории', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки' },
      { name: 'Очистка территории от снега', type: 'CLEANING', frequency: 'AS_NEEDED', description: 'По мере необходимости, но не реже 1 раза в сутки (холодный период)' },
      { name: 'Посыпка территории песком', type: 'MAINTENANCE', frequency: 'DAILY', description: '1 раз в сутки во время гололеда. Песком или песчано-соляной смесью (предоставляет Заказчик)' },
      { name: 'Очистка территории от наледи и льда', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки во время гололеда, 1 раз в 3 суток в обычные дни (холодный период)' },
      { name: 'Очистка урн от мусора', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки. Урны возле подъездов' },
      { name: 'Уборка приямков и площадок', type: 'CLEANING', frequency: 'DAILY', description: '1 раз в сутки. Площадки перед входом в подъезды' },
      { name: 'Уборка газонов', type: 'CLEANING', frequency: 'EVERY_OTHER_DAY', description: '1 раз в двое суток (теплый период)' },
      { name: 'Полив газонов и растений', type: 'MAINTENANCE', frequency: 'TWICE_WEEKLY', description: '2 раза в неделю. Газоны, кустарники, цветники и деревья (теплый период)' },
      { name: 'Выкашивание газонов', type: 'MAINTENANCE', frequency: 'AS_NEEDED', description: 'По мере необходимости (теплый период)' }
    ];
  }

  return [];
}

// Запускаем скрипт
addObjectsBatch2();
