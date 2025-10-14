const { PrismaClient } = require('@prisma/client');

async function addRemainingObjects() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Добавляем оставшиеся объекты из списка...\n');
    
    // Найдем админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!admin) {
      console.log('❌ Админ не найден. Сначала создайте админа.');
      return;
    }
    
    console.log('👤 Админ найден:', admin.name);

    // Создаем дополнительных менеджеров
    const additionalManagers = [
      { name: 'Штельмашенко Ирина Николаевна', phone: '+7 927 261 8137', email: 'shtelmashenko.irina@cleaning.com' },
      { name: 'Халидова Лилия Ильшатовна', phone: '+7 937 072 7651', email: 'halidova.liliya@cleaning.com' },
      { name: 'Шодиева Мухарам Джураевна', phone: '+7 937 980 1704', email: 'shodieva.muharam@cleaning.com' },
      { name: 'Будкова Светлана Владимировна', phone: '+79277406883', email: 'budkova.svetlana@cleaning.com' },
      { name: 'Напольская Людмила Петровна', phone: '+7 9370715422', email: 'napolskaya.ludmila@cleaning.com' },
      { name: 'Ласкин Павел Александрович', phone: '+79277570553', email: 'laskin.pavel@cleaning.com' },
      { name: 'Галиев Рустам Рафикович', phone: '+7 967 722 8013', email: 'galiev.rustam@cleaning.com' },
      { name: 'Гордеев Роман Владимирович', phone: '+7 987 955 1196', email: 'gordeev.roman@cleaning.com' },
      { name: 'Соколова Ольга Константиновна', phone: '+7 9170173062', email: 'sokolova.olga@cleaning.com' },
      { name: 'Тимохина Анна Анатольевна', phone: '+7 919 803 0999', email: 'timohina.anna@cleaning.com' },
      { name: 'Кобзева Анна Вячеславовна', phone: '+7 9279035948', email: 'kobzeva.anna@cleaning.com' },
      { name: 'Нувальцева Мария Александровна', phone: '+7 9179582793', email: 'nuvaltseva.maria@cleaning.com' },
      { name: 'Крапивко Лариса Владимировна', phone: '+7 987 987 3566', email: 'krapivko.larisa@cleaning.com' },
      { name: 'Бобровская Елена Владимировна', phone: '+7 937 994 9424', email: 'bobrovskaya.elena@cleaning.com' },
      { name: 'Брагина Катерина Юрьевна', phone: '+7 917 976 2778', email: 'bragina.katerina@cleaning.com' }
    ];

    const createdManagers = {};
    
    // Получаем уже существующих менеджеров
    const existingManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' }
    });
    
    existingManagers.forEach(manager => {
      createdManagers[manager.email] = manager;
    });
    
    for (const managerData of additionalManagers) {
      try {
        if (!createdManagers[managerData.email]) {
          console.log(`👤 Создаем менеджера: ${managerData.name}`);
          const manager = await prisma.user.create({
            data: {
              email: managerData.email,
              password: '$2b$10$rGHnQqgx5oQVHKJ8u.Vf4eKJ8u.Vf4eKJ8u.Vf4eKJ8u.Vf4eKJ8u.Vf4e', // manager123
              name: managerData.name,
              role: 'MANAGER'
            }
          });
          createdManagers[managerData.email] = manager;
        } else {
          console.log(`👤 Менеджер уже существует: ${managerData.name}`);
        }
      } catch (error) {
        console.error(`❌ Ошибка создания менеджера ${managerData.name}:`, error.message);
      }
    }

    // Создаем оставшиеся объекты
    const remainingObjects = [
      {
        name: 'ООО ЧОО «Гвардеец»',
        address: 'Самарская область, г. Самара, Красноглинский р-н, пос. Красная Глинка, б/н',
        type: 'Офисное помещение',
        managerEmail: 'gainullina.aina@cleaning.com'
      },
      {
        name: 'ПАО "БыстроБанк"',
        address: 'г. Самара, пр. Ленина,12А',
        type: 'Банк',
        managerEmail: 'yagoda.irina@cleaning.com'
      },
      {
        name: 'ООО "УК "Юг-сервис" (Южный город)',
        address: 'Самарская область, Волжский район, мкр. "Южный город"',
        type: 'Управление жилыми домами',
        managerEmail: 'shtelmashenko.irina@cleaning.com'
      },
      {
        name: 'ОАО "Самарский хлебозавод №5"',
        address: 'г. Самара, ул. Победы, 141а',
        type: 'Пищевое производство',
        managerEmail: 'napolskaya.ludmila@cleaning.com'
      },
      {
        name: 'УФПСО санаторий "Красная Глинка"',
        address: 'г. Самара, пос. Южный,36',
        type: 'Санаторий',
        managerEmail: 'isaicheva.margarita@cleaning.com'
      },
      {
        name: 'ООО "ЖилЭнерго" и ООО "ЖЭУ-66" (ЖК Эко-Град Волгарь)',
        address: 'г. Самара, Куйбышевский район, ЖК Эко-Град Волгарь',
        type: 'Управление жилыми домами',
        managerEmail: 'galiev.rustam@cleaning.com'
      },
      {
        name: 'ТСЖ "Спартак"',
        address: 'г. Самара, ул. Ново-Садовая, д. 29,31,33',
        type: 'Управление жилыми домами',
        managerEmail: 'vasekin.alexander@cleaning.com'
      },
      {
        name: 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС")',
        address: 'г. Самара, ул. Галактионовская,157',
        type: 'Медицинский центр',
        managerEmail: 'yagoda.irina@cleaning.com'
      },
      {
        name: 'АО "Росжелдорпроект" (АО "РЖДП")',
        address: 'г. Самара, ул. Красноармейская,137б',
        type: 'Проектирование инфраструктуры',
        managerEmail: 'vasekin.alexander@cleaning.com'
      },
      {
        name: 'ООО «Инкатех»',
        address: 'Самарская область, Нефтегорский район, село Семеновка / г. Нефтегорск, ул. Промышленности,1',
        type: 'Промышленное производство',
        managerEmail: 'kobzeva.anna@cleaning.com'
      },
      {
        name: 'ФГБОУ ВО СамГМУ Минздрава России',
        address: 'Самарская область,Волжский район,с.п. Верхняя Подстепновка,с. Преображенка,ул. Индустриальная,здание 1Б/29',
        type: 'Учебное заведение',
        managerEmail: 'galiev.rustam@cleaning.com'
      },
      {
        name: 'ООО «Маркет.Операции» (Яндекс)',
        address: 'Самарская область,Волжский район,с/п Верхняя Подстепновка,село Преображенка,ул. Индустриальная,д. 2А/5,Логистический комплекс "Придорожный", склад №8',
        type: 'Складское помещение',
        managerEmail: 'shtelmashenko.irina@cleaning.com'
      },
      {
        name: 'ФКУ «Центр хозяйственного и сервисного обеспечения ГУ МВД России по Самарской области»',
        address: 'Самарская область',
        type: 'Офисное помещение',
        managerEmail: 'sokolova.olga@cleaning.com'
      },
      {
        name: 'АО "Тяжмаш"',
        address: 'Самарская область, г. Сызрань, ул. Гидротурбинная,13',
        type: 'Машиностроительный завод',
        managerEmail: 'timohina.anna@cleaning.com'
      },
      {
        name: 'ООО "ПК Фарика Качества"',
        address: 'г. Тольятти, ул. Новозаводская,10',
        type: 'Производство мясных продуктов',
        managerEmail: 'krapivko.larisa@cleaning.com'
      },
      {
        name: 'МБУ «Лопатинское»',
        address: 'Набережная мкр. "Южный город"',
        type: 'Муниципально бюджетное учреждение',
        managerEmail: 'shtelmashenko.irina@cleaning.com'
      },
      {
        name: 'ООО "42"',
        address: 'г. Самара, Московское шоссе,4 ст9',
        type: 'Бизнес центр',
        managerEmail: 'plenkina.natalya@cleaning.com'
      },
      {
        name: 'ООО "Электрощит-Инжиниринг"',
        address: 'г. Самара, ул. Садовая,200',
        type: 'Офисное помещение',
        managerEmail: 'vasekin.alexander@cleaning.com'
      },
      {
        name: 'ООО "ЕТЭС"',
        address: 'г. Самара, ул. Молодогвардейская,224',
        type: 'Офисный центр',
        managerEmail: 'vasekin.alexander@cleaning.com'
      },
      {
        name: 'ООО «УК «Амонд-ЖилКомСервис»',
        address: 'г. Самара, 6-я просека, д.142;140;144 / г. Самара, пр. Кирова, 415А / г. Самара, ул. Демократическая, 30 / г. Самара, пр. Карла-Маркса, 245',
        type: 'Управление жилыми домами',
        managerEmail: 'budkova.svetlana@cleaning.com'
      },
      {
        name: 'ИП Широков Дмитрий Владимирович (Автомойка)',
        address: 'пос. Придорожный, мкр. Южный город, ул. Изумрудная,2А',
        type: 'Автомойка',
        managerEmail: 'shtelmashenko.irina@cleaning.com'
      },
      {
        name: 'ПАО «Самараэнерго»',
        address: 'г. Самара, ул. Молодогвардейская,224',
        type: 'Офисный центр',
        managerEmail: 'vasekin.alexander@cleaning.com'
      },
      {
        name: 'ООО "ФЛАГМАН"',
        address: 'г. Самара, Одесский переулок, дом 20, помещ. Н6',
        type: 'Офисный центр',
        managerEmail: 'vasekin.alexander@cleaning.com'
      },
      {
        name: 'ООО «НЛ Континент»',
        address: 'г. Самара, проспект Ленина, д. 12а',
        type: 'Магазин в торговом центре',
        managerEmail: 'plenkina.natalya@cleaning.com'
      },
      {
        name: 'ООО "БЦ "Сфера"',
        address: 'Самарская область, Волжский район, мкр. "Южный город"',
        type: 'Аренда и продажа помещений',
        managerEmail: 'shtelmashenko.irina@cleaning.com'
      }
    ];

    for (let i = 0; i < remainingObjects.length; i++) {
      const objectData = remainingObjects[i];
      console.log(`\n🏢 Создаем объект ${i + 1}/${remainingObjects.length}: ${objectData.name}`);

      try {
        const manager = createdManagers[objectData.managerEmail];
        if (!manager) {
          console.log(`❌ Менеджер не найден для объекта: ${objectData.name}`);
          continue;
        }

        // Проверяем, существует ли объект
        const existingObject = await prisma.cleaningObject.findFirst({
          where: { name: objectData.name }
        });

        if (existingObject) {
          console.log(`  ⚠️  Объект уже существует: ${objectData.name}`);
          continue;
        }

        const cleaningObject = await prisma.cleaningObject.create({
          data: {
            name: objectData.name,
            address: objectData.address,
            documents: { type: objectData.type },
            creatorId: admin.id,
            managerId: manager.id,
            workingHours: { start: "08:00", end: "20:00" },
            workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
            timezone: "Europe/Moscow",
            autoChecklistEnabled: true
          }
        });

        console.log(`  ✅ Объект создан с ID: ${cleaningObject.id}`);
        console.log(`  📋 Менеджер: ${manager.name}`);
      } catch (error) {
        console.error(`❌ Ошибка создания объекта ${objectData.name}:`, error.message);
      }
    }

    console.log('\n🎉 Все оставшиеся объекты добавлены!');
    
    // Статистика
    const totalObjects = await prisma.cleaningObject.count();
    const totalManagers = await prisma.user.count({ where: { role: 'MANAGER' } });
    
    console.log('\n📊 Итоговая статистика:');
    console.log(`   Всего объектов в системе: ${totalObjects}`);
    console.log(`   Всего менеджеров в системе: ${totalManagers}`);
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRemainingObjects();
