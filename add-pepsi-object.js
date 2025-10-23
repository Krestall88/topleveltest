const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Функция конвертации периодичности
function convertFrequency(frequency) {
  const frequencyMap = {
    'постоянно-круглосуточно': 'DAILY',
    'постоянно': 'DAILY',
    'ежедневно': 'DAILY',
    'ежесменно': 'DAILY',
    '1 раз в смену': 'DAILY',
    '2 раза в день': 'DAILY',
    '3 раза в день': 'DAILY',
    '1 раз в день': 'DAILY',
    '2 раза в неделю': 'WEEKLY',
    '1 раз в неделю': 'WEEKLY',
    'еженедельно': 'WEEKLY',
    '1 раз в месяц': 'MONTHLY',
    'ежемесячно': 'MONTHLY',
    '1 раз в 2 месяца': 'MONTHLY',
    '1 раз в 3 месяца': 'QUARTERLY',
    '1 раз в полугодие': 'QUARTERLY',
    '1 раз в год': 'QUARTERLY',
    'по мере необходимости': 'ON_DEMAND',
    'по мере загрязнения': 'ON_DEMAND'
  };
  
  // Поиск точного совпадения
  if (frequencyMap[frequency.toLowerCase()]) {
    return frequencyMap[frequency.toLowerCase()];
  }
  
  // Поиск частичного совпадения
  for (const [key, value] of Object.entries(frequencyMap)) {
    if (frequency.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  return 'DAILY'; // По умолчанию
}

// Данные объекта Пепси
const pepsiData = {
  name: 'ООО «ПепсиКо Холдингс»',
  address: 'Адрес не указан',
  totalArea: 1515,
  description: 'Производственный комплекс пищевой промышленности Пепси (1515 кв.м.)',
  
  zones: [
    {
      name: 'Зона 1. Производство',
      description: 'Основная производственная зона',
      roomGroups: [
        {
          name: 'Зона розлива',
          rooms: [
            { name: 'Зона розлива', area: 200 }
          ],
          techCards: [
            {
              name: 'Влажная санитарная обработка полов',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка полов от налипания',
              frequency: 'постоянно-круглосуточно'
            },
            {
              name: 'Влажная санитарная обработка площадок обслуживания',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка площадок обслуживания',
              frequency: 'ежедневно'
            },
            {
              name: 'Влажная санитарная обработка стен до 1.8м',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка стен на высоте до 1.8м',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная санитарная обработка стен выше 1.8м',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка стен на высоте выше 1.8м',
              frequency: '1 раз в 3 месяца'
            },
            {
              name: 'Влажная обработка дверей',
              workType: 'CLEANING',
              description: 'Влажная обработка дверей (1 раз в смену)',
              frequency: 'ежедневно'
            },
            {
              name: 'Влажная обработка ворот',
              workType: 'CLEANING',
              description: 'Влажная обработка ворот',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная санитарная обработка дренажей',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка дренажей и дренажных решеток',
              frequency: 'ежедневно'
            },
            {
              name: 'Влажная обработка пожарных ящиков',
              workType: 'CLEANING',
              description: 'Влажная обработка пожарных ящиков',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная санитарная обработка лестниц и платформ',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка лестниц, платформ и трапов',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная наружная санитарная обработка шлангов',
              workType: 'DISINFECTION',
              description: 'Влажная наружная санитарная обработка шлангов',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная санитарная обработка емкостей для промывки глаз',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка емкостей для промывки глаз',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная обработка стеклянных окон',
              workType: 'CLEANING',
              description: 'Влажная обработка стеклянных окон',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная обработка полок',
              workType: 'CLEANING',
              description: 'Влажная обработка полок',
              frequency: '1 раз в неделю'
            },
            {
              name: 'Влажная наружная обработка умывальников и кранов',
              workType: 'CLEANING',
              description: 'Влажная наружная обработка умывальников, водопроводных кранов',
              frequency: '1 раз в смену'
            },
            {
              name: 'Влажная санитарная обработка дез.ковриков',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка, замена средства дез.ковриков',
              frequency: '1 раз в смену'
            },
            {
              name: 'Размещение расходных материалов',
              workType: 'MAINTENANCE',
              description: 'Размещение салфеток, мыла, дезинфектанта',
              frequency: 'ежедневно'
            },
            {
              name: 'Влажная обработка дозаторов',
              workType: 'CLEANING',
              description: 'Влажная обработка дезинфектанта, дозатора мыла, салфетниц',
              frequency: 'ежедневно'
            },
            {
              name: 'Влажная санитарная обработка инвентаря',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка инвентаря после проведения уборки в конце смены',
              frequency: 'ежесменно'
            },
            {
              name: 'Внутренняя обработка вытяжных систем',
              workType: 'MAINTENANCE',
              description: 'Внутренняя обработка при разборе системы, мойка, санитарная обработка вытяжных систем вентиляции',
              frequency: '1 раз в 3 месяца'
            },
            {
              name: 'Влажная санитарная обработка мусорных контейнеров',
              workType: 'DISINFECTION',
              description: 'Влажная санитарная обработка мусорных контейнеров, замена пакетов',
              frequency: '1 раз в смену'
            }
          ]
        }
      ]
    }
  ]
};

async function createPepsiObject() {
  try {
    console.log('🏭 СОЗДАНИЕ ОБЪЕКТА ПЕПСИ');
    console.log('========================\n');

    // Находим админа для привязки как создателя
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      throw new Error('Не найден пользователь с ролью ADMIN');
    }

    // Проверяем, существует ли уже объект Пепси
    const existingObject = await prisma.cleaningObject.findFirst({
      where: { name: pepsiData.name }
    });

    if (existingObject) {
      console.log(`⚠️ Объект "${pepsiData.name}" уже существует (ID: ${existingObject.id})`);
      console.log('Обновляем существующий объект...\n');
      
      // Обновляем объект
      const cleaningObject = await prisma.cleaningObject.update({
        where: { id: existingObject.id },
        data: {
          totalArea: pepsiData.totalArea,
          description: pepsiData.description,
          timezone: 'Europe/Moscow',
          workingHours: JSON.stringify({ start: '08:00', end: '20:00' }),
          workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          autoChecklistEnabled: true
        }
      });

      console.log(`✅ Объект обновлен: ${cleaningObject.name}`);
      await addZonesAndTechCards(cleaningObject.id);
      
    } else {
      // Создаем новый объект
      const cleaningObject = await prisma.cleaningObject.create({
        data: {
          name: pepsiData.name,
          address: pepsiData.address,
          totalArea: pepsiData.totalArea,
          description: pepsiData.description,
          timezone: 'Europe/Moscow',
          workingHours: JSON.stringify({ start: '08:00', end: '20:00' }),
          workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          autoChecklistEnabled: true,
          creatorId: admin.id
        }
      });

      console.log(`✅ Объект создан: ${cleaningObject.name}`);
      await addZonesAndTechCards(cleaningObject.id);
    }

  } catch (error) {
    console.error('❌ Ошибка при создании объекта Пепси:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function addZonesAndTechCards(objectId) {
  let totalTechCards = 0;

  // Создаем участок
  const site = await prisma.site.create({
    data: {
      name: 'Производственный комплекс',
      description: 'Основной производственный участок Пепси',
      objectId: objectId
    }
  });

  console.log(`  🏗️ Участок создан: ${site.name}`);

  // Обрабатываем зоны
  for (const zoneData of pepsiData.zones) {
    console.log(`  📍 Создаем зону: ${zoneData.name}`);
    
    const zone = await prisma.zone.create({
      data: {
        name: zoneData.name,
        description: zoneData.description,
        siteId: site.id
      }
    });

    // Обрабатываем группы помещений
    for (const roomGroupData of zoneData.roomGroups) {
      console.log(`    📦 Создаем группу помещений: ${roomGroupData.name}`);
      
      const roomGroup = await prisma.roomGroup.create({
        data: {
          name: roomGroupData.name,
          description: `Группа помещений ${roomGroupData.name}`,
          zoneId: zone.id
        }
      });

      // Обрабатываем помещения
      for (const roomData of roomGroupData.rooms) {
        console.log(`      🏠 Создаем помещение: ${roomData.name}`);
        
        const room = await prisma.room.create({
          data: {
            name: roomData.name,
            area: roomData.area,
            roomGroupId: roomGroup.id,
            objectId: objectId
          }
        });

        // Создаем техкарты для этого помещения
        for (const techCardData of roomGroupData.techCards) {
          const techCard = await prisma.techCard.create({
            data: {
              name: techCardData.name,
              workType: techCardData.workType,
              description: techCardData.description,
              frequency: convertFrequency(techCardData.frequency),
              roomId: room.id,
              objectId: objectId
            }
          });
          totalTechCards++;
        }
      }
    }
  }

  console.log(`\n📊 СТАТИСТИКА:`);
  console.log(`  - Участков: 1`);
  console.log(`  - Зон: ${pepsiData.zones.length}`);
  console.log(`  - Техкарт создано: ${totalTechCards}`);
  console.log(`\n🎉 Объект Пепси успешно создан!`);
}

// Запуск создания объекта
createPepsiObject();
