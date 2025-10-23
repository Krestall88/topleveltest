const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSitesForMajorObjects() {
  try {
    console.log('🏢 СОЗДАНИЕ УЧАСТКОВ ДЛЯ КРУПНЫХ ОБЪЕКТОВ');
    console.log('=========================================\n');

    // Находим админа для логирования
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Получаем все объекты с их менеджерами
    const objects = await prisma.cleaningObject.findMany({
      include: {
        manager: {
          select: { id: true, name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📋 Найдено объектов: ${objects.length}\n`);

    // Шаблоны участков для разных типов объектов
    const siteTemplates = {
      // Торговые центры
      mall: [
        { name: 'Торговые залы 1 этаж', description: 'Основные торговые площади первого этажа', areaRatio: 0.35 },
        { name: 'Торговые залы 2 этаж', description: 'Торговые площади второго этажа', areaRatio: 0.25 },
        { name: 'Фуд-корт', description: 'Зона питания и ресторанов', areaRatio: 0.15 },
        { name: 'Общественные зоны', description: 'Холлы, коридоры, зоны отдыха', areaRatio: 0.10 },
        { name: 'Санузлы', description: 'Туалетные комнаты для посетителей', areaRatio: 0.05 },
        { name: 'Служебные помещения', description: 'Офисы администрации, подсобки', areaRatio: 0.05 },
        { name: 'Парковка', description: 'Парковочные места и прилегающая территория', areaRatio: 0.05 }
      ],
      
      // Офисные здания
      office: [
        { name: 'Офисные помещения', description: 'Рабочие места сотрудников', areaRatio: 0.50 },
        { name: 'Переговорные комнаты', description: 'Конференц-залы и переговорные', areaRatio: 0.10 },
        { name: 'Холлы и коридоры', description: 'Общественные зоны и проходы', areaRatio: 0.15 },
        { name: 'Санузлы', description: 'Туалетные комнаты', areaRatio: 0.08 },
        { name: 'Кухни и зоны отдыха', description: 'Места для приема пищи и отдыха', areaRatio: 0.07 },
        { name: 'Серверная и техпомещения', description: 'IT-оборудование и технические помещения', areaRatio: 0.05 },
        { name: 'Прилегающая территория', description: 'Входная группа и парковка', areaRatio: 0.05 }
      ],
      
      // Производственные объекты
      production: [
        { name: 'Производственные цеха', description: 'Основные производственные помещения', areaRatio: 0.40 },
        { name: 'Складские помещения', description: 'Склады сырья и готовой продукции', areaRatio: 0.25 },
        { name: 'Административное здание', description: 'Офисы управления и администрации', areaRatio: 0.15 },
        { name: 'Технические помещения', description: 'Котельная, электрощитовая, вентиляция', areaRatio: 0.08 },
        { name: 'Бытовые помещения', description: 'Раздевалки, душевые, столовая', areaRatio: 0.07 },
        { name: 'Прилегающая территория', description: 'Территория предприятия', areaRatio: 0.05 }
      ],
      
      // Универсальный шаблон
      general: [
        { name: 'Основные помещения', description: 'Главные рабочие/функциональные помещения', areaRatio: 0.50 },
        { name: 'Вспомогательные помещения', description: 'Подсобные и технические помещения', areaRatio: 0.20 },
        { name: 'Общественные зоны', description: 'Холлы, коридоры, зоны ожидания', areaRatio: 0.15 },
        { name: 'Санузлы', description: 'Туалетные комнаты', areaRatio: 0.08 },
        { name: 'Служебные помещения', description: 'Офисы, кабинеты администрации', areaRatio: 0.07 }
      ]
    };

    // Функция определения типа объекта
    function getObjectType(objectName) {
      const name = objectName.toLowerCase();
      if (name.includes('тц') || name.includes('торговый') || name.includes('мелодия')) {
        return 'mall';
      } else if (name.includes('офис') || name.includes('бизнес') || name.includes('центр')) {
        return 'office';
      } else if (name.includes('завод') || name.includes('фабрика') || name.includes('производство') || 
                 name.includes('электрощит') || name.includes('пепсико')) {
        return 'production';
      } else {
        return 'general';
      }
    }

    // Функция извлечения площади из названия объекта
    function extractArea(objectName) {
      const areaMatch = objectName.match(/(\d+(?:\.\d+)?)\s*(?:кв\.?\s*м|м²)/i);
      if (areaMatch) {
        return parseFloat(areaMatch[1]);
      }
      // Если площадь не указана, используем среднее значение
      return 1000;
    }

    let totalCreated = 0;
    let processedObjects = 0;

    for (const object of objects) {
      try {
        // Проверяем, есть ли уже участки у этого объекта
        const existingSites = await prisma.site.count({
          where: { objectId: object.id }
        });

        if (existingSites > 0) {
          console.log(`⏭️  Пропущен ${object.name} - уже имеет ${existingSites} участков`);
          continue;
        }

        console.log(`\n🏗️ Создание участков для: ${object.name}`);
        console.log(`👤 Менеджер: ${object.manager?.name || 'не назначен'}`);

        // Определяем тип объекта и шаблон
        const objectType = getObjectType(object.name);
        const template = siteTemplates[objectType];
        const totalArea = extractArea(object.name);

        console.log(`📐 Общая площадь: ${totalArea} м²`);
        console.log(`🏷️  Тип объекта: ${objectType}`);
        console.log(`📋 Участков по шаблону: ${template.length}`);

        let createdForObject = 0;

        for (const siteTemplate of template) {
          const siteArea = Math.round(totalArea * siteTemplate.areaRatio);
          
          const siteData = {
            name: siteTemplate.name,
            description: siteTemplate.description,
            area: siteArea,
            objectId: object.id,
            managerId: object.manager?.id
          };

          try {
            const site = await prisma.site.create({
              data: siteData
            });

            console.log(`   ✅ ${site.name} (${site.area} м²)`);

            // Логируем в аудит
            if (admin) {
              await prisma.auditLog.create({
                data: {
                  userId: admin.id,
                  action: 'CREATE_SITE',
                  entity: 'SITE',
                  entityId: site.id,
                  details: `Автоматически создан участок: ${site.name} для объекта ${object.name}`
                }
              });
            }

            createdForObject++;
            totalCreated++;

          } catch (error) {
            console.log(`   ❌ Ошибка создания ${siteTemplate.name}: ${error.message}`);
          }
        }

        console.log(`   📊 Создано участков: ${createdForObject}`);
        processedObjects++;

      } catch (error) {
        console.log(`❌ Ошибка обработки объекта ${object.name}: ${error.message}`);
      }
    }

    // Итоговая статистика
    console.log('\n' + '='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(50));
    console.log(`🏢 Обработано объектов: ${processedObjects}`);
    console.log(`✅ Всего создано участков: ${totalCreated}`);
    console.log(`📈 Среднее участков на объект: ${processedObjects > 0 ? Math.round(totalCreated / processedObjects * 10) / 10 : 0}`);

    // Показываем статистику по объектам с участками
    const objectsWithSites = await prisma.cleaningObject.findMany({
      include: {
        _count: {
          select: { sites: true }
        },
        manager: {
          select: { name: true }
        }
      },
      where: {
        sites: {
          some: {}
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n🗺️  ОБЪЕКТЫ С УЧАСТКАМИ (${objectsWithSites.length}):`);
    objectsWithSites.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   🗺️  Участков: ${obj._count.sites}`);
      console.log(`   👤 Менеджер: ${obj.manager?.name || 'не назначен'}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSitesForMajorObjects();
