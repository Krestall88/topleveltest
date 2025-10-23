const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function loadObjectETES() {
  try {
    console.log('🏢 ЗАГРУЗКА ОБЪЕКТА: ООО «ЕТЭС»');
    console.log('=================================\n');

    // Создаем или находим объект
    const objectName = 'Общество с ограниченной ответственностью «Единые Транспортные ЭнергоСистемы» (ООО «ЕТЭС»)';
    const objectAddress = 'г. Самара, ул. Молодогвардейская, 224';

    let cleaningObject = await prisma.cleaningObject.findFirst({
      where: { 
        OR: [
          { name: objectName },
          { name: { contains: 'ЕТЭС' } },
          { name: { contains: 'Единые Транспортные ЭнергоСистемы' } }
        ]
      }
    });

    if (!cleaningObject) {
      // Находим админа для создания объекта
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!admin) {
        throw new Error('Не найден администратор для создания объекта');
      }

      cleaningObject = await prisma.cleaningObject.create({
        data: {
          name: objectName,
          address: objectAddress,
          description: 'ООО «ЕТЭС» - транспортно-энергетическая компания',
          creatorId: admin.id
        }
      });
      console.log(`✅ Создан новый объект: ${objectName}`);
    } else {
      console.log(`📍 Найден существующий объект: ${cleaningObject.name}`);
    }

    console.log(`   ID объекта: ${cleaningObject.id}`);
    console.log(`   Адрес: ${cleaningObject.address}\n`);

    // Очищаем старые данные ObjectStructure для этого объекта
    console.log('🗑️ Очистка старых данных...');
    const deletedCount = await prisma.objectStructure.deleteMany({
      where: { objectId: cleaningObject.id }
    });
    console.log(`   Удалено записей: ${deletedCount.count}\n`);

    // Данные техкарт из предоставленного текста
    const techCards = [
      {
        zoneName: 'Офисная зона',
        roomGroupName: 'Основные помещения',
        roomName: 'Ежедневная уборка помещений (площадь 1200 м2)',
        techCardName: 'Ежедневная уборка помещений (площадь 1200 м2)',
        frequency: 'Ежедневно',
        workType: 'Общая уборка',
        period: 'Ежедневно',
        description: 'Ежедневная уборка офисных помещений общей площадью 1200 м2',
        notes: '5/2 с 18:00'
      },
      {
        zoneName: 'Лестничные клетки',
        roomGroupName: 'Основные лестницы',
        roomName: 'Основная лестница с 9 по 11 этажи',
        techCardName: 'Уборка основной лестницы с 9 по 11 этажи',
        frequency: 'Ежедневно',
        workType: 'Влажная уборка',
        period: 'Ежедневно',
        description: 'Ежедневная уборка основной лестницы с 9 по 11 этажи',
        notes: '5/2 с 18:00'
      },
      {
        zoneName: 'Лестничные клетки',
        roomGroupName: 'Дополнительные лестницы',
        roomName: 'Доп. лестница с 9 по 11 этажи',
        techCardName: 'Уборка дополнительной лестницы с 9 по 11 этажи',
        frequency: '1 раз в месяц',
        workType: 'Влажная уборка',
        period: 'Ежемесячно',
        description: 'Ежемесячная уборка дополнительной лестницы с 9 по 11 этажи',
        notes: ''
      },
      {
        zoneName: 'Входная группа',
        roomGroupName: 'Входная зона',
        roomName: 'Входная зона с ул. Молодогвардейская (площадь 71.3 м2)',
        techCardName: 'Уборка входной зоны с ул. Молодогвардейская',
        frequency: 'По графику по нечетным датам в рабочие дни',
        workType: 'Влажная уборка',
        period: 'По графику',
        description: 'Уборка входной зоны с ул. Молодогвардейская площадью 71.3 м2',
        notes: 'По нечетным датам в рабочие дни'
      },
      {
        zoneName: 'Цокольный этаж',
        roomGroupName: 'Служебные помещения',
        roomName: 'Цоколь: медпункт, комната водителей (площадь 28.5 м2)',
        techCardName: 'Уборка медпункта и комнаты водителей в цоколе',
        frequency: 'По графику по нечетным датам в рабочие дни',
        workType: 'Влажная уборка',
        period: 'По графику',
        description: 'Уборка медпункта и комнаты водителей в цокольном этаже площадью 28.5 м2',
        notes: 'По нечетным датам в рабочие дни'
      }
    ];

    console.log('💾 ЗАГРУЗКА ТЕХКАРТ В БАЗУ ДАННЫХ:');
    console.log('==================================');

    let successCount = 0;
    for (const [index, techCard] of techCards.entries()) {
      try {
        await prisma.objectStructure.create({
          data: {
            objectId: cleaningObject.id,
            objectName: cleaningObject.name,
            siteName: 'Офисное здание',
            zoneName: techCard.zoneName,
            roomGroupName: techCard.roomGroupName,
            roomName: techCard.roomName,
            cleaningObjectName: techCard.roomName,
            techCardName: techCard.techCardName,
            frequency: techCard.frequency,
            workType: techCard.workType,
            description: techCard.description,
            notes: techCard.notes,
            period: techCard.period,
            techCardId: `etes_${index + 1}_${Date.now()}`
          }
        });
        
        successCount++;
        console.log(`✅ Загружена техкарта ${index + 1}: ${techCard.techCardName}`);
        
      } catch (error) {
        console.error(`❌ Ошибка при загрузке техкарты ${index + 1}:`, error.message);
      }
    }

    console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('========================');
    console.log(`✅ Успешно загружено: ${successCount}`);
    console.log(`📊 Всего техкарт: ${techCards.length}`);

    // Проверка
    const finalCheck = await prisma.objectStructure.findMany({
      where: { objectId: cleaningObject.id }
    });

    console.log(`🎯 Проверка: в БД ${finalCheck.length} техкарт`);

    console.log('\n✅ ЗАГРУЗКА ООО «ЕТЭС» ЗАВЕРШЕНА!');
    console.log(`🏢 Объект ID: ${cleaningObject.id}`);
    console.log('📋 Готов к назначению менеджера и созданию чек-листов');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadObjectETES();
