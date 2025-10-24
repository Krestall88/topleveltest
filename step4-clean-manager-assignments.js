const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ПРАВИЛЬНЫЕ назначения менеджеров из update-assignments-fixed.js
const correctAssignments = [
  // ЮГ-СЕРВИС - 4 менеджера по участкам
  {
    objectSearchTerm: 'УК Юг-сервис',
    assignments: [
      {
        managerName: 'Штельмашенко Ирина Николаевна',
        comment: '2 очередь',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Халидова Лилия Ильшатовна', 
        comment: '5 очередь'
      },
      {
        managerName: 'Шодиева Мухарам(Гуля) Джураевна',
        comment: '3 очередь'
      },
      {
        managerName: 'Будкова Светлана Владимировна',
        comment: 'Желябово'
      }
    ]
  },
  
  // ПЕПСИКО - 3 менеджера
  {
    objectSearchTerm: 'ПепсиКо',
    assignments: [
      {
        managerName: 'Исайчева Маргарита Николаевна',
        comment: 'старший менеджер',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Ласкин Павел Александрович',
        comment: 'ул. 5 квартал,3а'
      },
      {
        managerName: 'Васекин Александр Александрович',
        comment: 'ул. Мяги,10а'
      }
    ]
  },
  
  // ЭЛЕКТРОЩИТ - 2 менеджера
  {
    objectSearchTerm: 'ЭЛЕКТРОЩИТ',
    assignments: [
      {
        managerName: 'Гайнуллина Айна Алиевна',
        comment: 'Русский трансформатор и остальные участки на Красной Глинке',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Исайчева Маргарита Николаевна',
        comment: 'Заводоуправление и Инжиниринг, стадион Энергия'
      }
    ]
  },
  
  // ТЯЖМАШ - 2 менеджера
  {
    objectSearchTerm: 'ТЯЖМАШ',
    assignments: [
      {
        managerName: 'Тимохина Анна Анатольевна',
        comment: '',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Гайнуллина Айна Алиевна',
        comment: 'старший менеджер'
      }
    ]
  },
  
  // ВОЛГАРЬ - 2 менеджера
  {
    objectSearchTerm: 'Волгарь',
    assignments: [
      {
        managerName: 'Галиев Рустам Рафикович',
        comment: 'по уборке внутренней территории',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Васекин Александр Александрович',
        comment: 'менеджер по уборке внешней территории'
      }
    ]
  },
  
  // ИНКАТЕХ - 2 менеджера
  {
    objectSearchTerm: 'ИНКАТЕХ',
    assignments: [
      {
        managerName: 'Кобзева Анна Вячеславовна',
        comment: '',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Нувальцева Мария Александровна',
        comment: 'старший менеджер'
      }
    ]
  },
  
  // ФАБРИКА КАЧЕСТВА - 2 менеджера
  {
    objectSearchTerm: 'ФАБРИКА КАЧЕСТВА',
    assignments: [
      {
        managerName: 'Крапивко Лариса Владимировна',
        comment: '',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Исайчева Маргарита Николаевна',
        comment: 'старший менеджер'
      }
    ]
  },
  
  // МАРКЕТ.ОПЕРАЦИИ (ЯНДЕКС) - 2 менеджера
  {
    objectSearchTerm: 'Маркет.Операции',
    assignments: [
      {
        managerName: 'Штельмашенко Ирина Николаевна',
        comment: 'старший менеджер',
        isMainManager: true // Основной менеджер объекта
      },
      {
        managerName: 'Гордеев Роман Владимирович',
        comment: ''
      }
    ]
  }
];

// Объекты с одним менеджером
const singleManagerObjects = [
  { searchTerm: 'Медицина АльфаСтрахования МедАС', managerName: 'Ягода Ирина Александровна' },
  { searchTerm: 'КОМПАКТИВ', managerName: 'Пленкина Наталья Алексеевна' },
  { searchTerm: 'ООО ЧОО Гвардеец', managerName: 'Гайнуллина Айна Алиевна' },
  { searchTerm: 'ПАО «БыстроБанк»', managerName: 'Ягода Ирина Александровна' },
  { searchTerm: 'ОАО «Самарский хлебозавод №5»', managerName: 'Напольская Людмила Петровна' },
  { searchTerm: 'УФПСО санаторий «Красная Глинка»', managerName: 'Исайчева Маргарита Николаевна' },
  { searchTerm: 'ТСЖ «Спартак»', managerName: 'Васекин Александр Александрович' },
  { searchTerm: 'Желдорпроект Поволжья', managerName: 'Васекин Александр Александрович' },
  { searchTerm: 'ФГБОУ ВО СамГМУ Минздрава России', managerName: 'Галиев Рустам Рафикович' }
];

async function cleanManagerAssignments() {
  console.log('🎯 ЧИСТАЯ ПРИВЯЗКА МЕНЕДЖЕРОВ К ОБЪЕКТАМ\n');
  
  let successCount = 0;
  let errorCount = 0;
  let notFoundObjects = [];
  let notFoundManagers = [];
  
  try {
    // 1. ОБЪЕКТЫ С НЕСКОЛЬКИМИ МЕНЕДЖЕРАМИ
    console.log('📋 ОБРАБАТЫВАЕМ ОБЪЕКТЫ С НЕСКОЛЬКИМИ МЕНЕДЖЕРАМИ:\n');
    
    for (const objectInfo of correctAssignments) {
      console.log(`🏢 Объект: ${objectInfo.objectSearchTerm}`);
      
      // Ищем объект
      const object = await prisma.cleaningObject.findFirst({
        where: {
          name: {
            contains: objectInfo.objectSearchTerm,
            mode: 'insensitive'
          }
        }
      });
      
      if (!object) {
        console.log(`   ❌ Объект не найден: ${objectInfo.objectSearchTerm}`);
        notFoundObjects.push(objectInfo.objectSearchTerm);
        errorCount++;
        continue;
      }
      
      console.log(`   ✅ Найден: ${object.name} (ID: ${object.id})`);
      
      // Обрабатываем назначения
      for (const assignment of objectInfo.assignments) {
        console.log(`   👤 Назначаем: ${assignment.managerName}`);
        
        // Ищем менеджера
        const manager = await prisma.user.findFirst({
          where: {
            role: 'MANAGER',
            name: {
              contains: assignment.managerName,
              mode: 'insensitive'
            }
          }
        });
        
        if (!manager) {
          console.log(`      ❌ Менеджер не найден: ${assignment.managerName}`);
          notFoundManagers.push(assignment.managerName);
          errorCount++;
          continue;
        }
        
        // Назначаем основного менеджера объекта
        if (assignment.isMainManager) {
          await prisma.cleaningObject.update({
            where: { id: object.id },
            data: { managerId: manager.id }
          });
          console.log(`      ✅ Назначен основным менеджером объекта`);
        }
        
        // Создаем или обновляем участок
        const siteName = assignment.comment || `Участок ${assignment.managerName}`;
        
        const existingSite = await prisma.site.findFirst({
          where: {
            objectId: object.id,
            OR: [
              { name: siteName },
              { comment: assignment.comment }
            ]
          }
        });
        
        if (existingSite) {
          // Обновляем существующий участок
          await prisma.site.update({
            where: { id: existingSite.id },
            data: { 
              managerId: manager.id,
              comment: assignment.comment,
              name: siteName
            }
          });
          console.log(`      ✅ Обновлен участок: ${siteName}`);
        } else {
          // Создаем новый участок
          await prisma.site.create({
            data: {
              name: siteName,
              objectId: object.id,
              managerId: manager.id,
              comment: assignment.comment
            }
          });
          console.log(`      ✅ Создан участок: ${siteName}`);
        }
        
        successCount++;
      }
      
      console.log(''); // Пустая строка для разделения
    }
    
    // 2. ОБЪЕКТЫ С ОДНИМ МЕНЕДЖЕРОМ
    console.log('\n📋 ОБРАБАТЫВАЕМ ОБЪЕКТЫ С ОДНИМ МЕНЕДЖЕРОМ:\n');
    
    for (const singleObj of singleManagerObjects) {
      console.log(`🏢 Объект: ${singleObj.searchTerm}`);
      
      // Ищем объект
      const object = await prisma.cleaningObject.findFirst({
        where: {
          name: {
            contains: singleObj.searchTerm,
            mode: 'insensitive'
          }
        }
      });
      
      if (!object) {
        console.log(`   ❌ Объект не найден: ${singleObj.searchTerm}`);
        notFoundObjects.push(singleObj.searchTerm);
        errorCount++;
        continue;
      }
      
      // Ищем менеджера
      const manager = await prisma.user.findFirst({
        where: {
          role: 'MANAGER',
          name: {
            contains: singleObj.managerName,
            mode: 'insensitive'
          }
        }
      });
      
      if (!manager) {
        console.log(`   ❌ Менеджер не найден: ${singleObj.managerName}`);
        notFoundManagers.push(singleObj.managerName);
        errorCount++;
        continue;
      }
      
      // Назначаем основного менеджера
      await prisma.cleaningObject.update({
        where: { id: object.id },
        data: { managerId: manager.id }
      });
      
      console.log(`   ✅ ${object.name} → ${manager.name}`);
      successCount++;
    }
    
    // 3. ФИНАЛЬНАЯ ПРОВЕРКА
    console.log('\n📊 ФИНАЛЬНАЯ ПРОВЕРКА НАЗНАЧЕНИЙ:\n');
    
    const allAssignedObjects = await prisma.cleaningObject.findMany({
      where: {
        OR: [
          ...correctAssignments.map(obj => ({
            name: { contains: obj.objectSearchTerm, mode: 'insensitive' }
          })),
          ...singleManagerObjects.map(obj => ({
            name: { contains: obj.searchTerm, mode: 'insensitive' }
          }))
        ]
      },
      include: {
        manager: { select: { name: true } },
        sites: {
          where: { managerId: { not: null } },
          include: { manager: { select: { name: true } } }
        }
      }
    });
    
    allAssignedObjects.forEach(obj => {
      console.log(`✅ ${obj.name}`);
      console.log(`   Основной: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Участков с менеджерами: ${obj.sites.length}`);
      
      obj.sites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.comment || site.name}: ${site.manager?.name}`);
      });
      console.log('');
    });
    
    console.log('📊 ИТОГИ:');
    console.log(`✅ Успешных назначений: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    
    if (notFoundObjects.length > 0) {
      console.log('\n🔍 Не найденные объекты:');
      notFoundObjects.forEach(obj => console.log(`   - ${obj}`));
    }
    
    if (notFoundManagers.length > 0) {
      console.log('\n👥 Не найденные менеджеры:');
      notFoundManagers.forEach(mgr => console.log(`   - ${mgr}`));
    }
    
  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanManagerAssignments();
