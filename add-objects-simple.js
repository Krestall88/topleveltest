const { PrismaClient } = require('@prisma/client');

async function addObjectsSimple() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Добавляем объекты и менеджеров...\n');
    
    // Найдем админа
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!admin) {
      console.log('❌ Админ не найден. Сначала создайте админа.');
      return;
    }
    
    console.log('👤 Админ найден:', admin.name);

    // Создаем несколько ключевых менеджеров
    const managersToCreate = [
      { name: 'Ягода Ирина Александровна', phone: '+7 9371782997', email: 'yagoda.irina@cleaning.com' },
      { name: 'Пленкина Наталья Алексеевна', phone: '+7 9874416835', email: 'plenkina.natalya@cleaning.com' },
      { name: 'Гайнуллина Айна Алиевна', phone: '+7 9371841382', email: 'gainullina.aina@cleaning.com' },
      { name: 'Исайчева Маргарита Николаевна', phone: '+7 9277576436', email: 'isaicheva.margarita@cleaning.com' },
      { name: 'Васекин Александр Александрович', phone: '+7 927 716 5189', email: 'vasekin.alexander@cleaning.com' }
    ];

    const createdManagers = {};
    
    for (const managerData of managersToCreate) {
      try {
        // Проверяем, существует ли менеджер
        let manager = await prisma.user.findUnique({
          where: { email: managerData.email }
        });

        if (!manager) {
          console.log(`👤 Создаем менеджера: ${managerData.name}`);
          manager = await prisma.user.create({
            data: {
              email: managerData.email,
              password: '$2b$10$rGHnQqgx5oQVHKJ8u.Vf4eKJ8u.Vf4eKJ8u.Vf4eKJ8u.Vf4eKJ8u.Vf4e', // manager123
              name: managerData.name,
              role: 'MANAGER'
            }
          });
        } else {
          console.log(`👤 Менеджер уже существует: ${managerData.name}`);
        }
        
        createdManagers[managerData.email] = manager;
      } catch (error) {
        console.error(`❌ Ошибка создания менеджера ${managerData.name}:`, error.message);
      }
    }

    // Создаем несколько ключевых объектов
    const objectsToCreate = [
      {
        name: 'ООО «Альфа» (ТЦ Мелодия)',
        address: 'г. Самара, пр. Ленина,12А',
        type: 'Торговый центр',
        managerEmail: 'yagoda.irina@cleaning.com'
      },
      {
        name: 'ООО "УК БИГ-БЕН"',
        address: 'г. Самара, ул. Московское шоссе,4, ст 9',
        type: 'Офисный центр',
        managerEmail: 'plenkina.natalya@cleaning.com'
      },
      {
        name: 'АО «ГК «Электрощит» -ТМ Самара»',
        address: 'г. Самара, пос. Красная Глинка и г. Самара, ул. Заводское шоссе,11А',
        type: 'Промышленное производство',
        managerEmail: 'gainullina.aina@cleaning.com'
      },
      {
        name: 'ООО «ПепсиКо Холдингс»',
        address: 'г. Самара, 5 квартал,3а / г. Самара, ул. Мяги,10а',
        type: 'Пищевое производство',
        managerEmail: 'isaicheva.margarita@cleaning.com'
      },
      {
        name: 'ООО «Нектар»',
        address: 'г. Самара, ул. Мальцева,9',
        type: 'Пищевое производство',
        managerEmail: 'vasekin.alexander@cleaning.com'
      }
    ];

    for (let i = 0; i < objectsToCreate.length; i++) {
      const objectData = objectsToCreate[i];
      console.log(`\n🏢 Создаем объект ${i + 1}/${objectsToCreate.length}: ${objectData.name}`);

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
            documents: { type: objectData.type }, // Сохраняем тип в documents
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

    console.log('\n🎉 Базовые объекты и менеджеры добавлены!');
    
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

addObjectsSimple();
