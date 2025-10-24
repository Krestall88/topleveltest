const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupWrongAssignments() {
  console.log('🧹 ОЧИСТКА НЕПРАВИЛЬНЫХ НАЗНАЧЕНИЙ МЕНЕДЖЕРОВ\n');
  
  try {
    // Список объектов, которые нужно очистить от неправильных участков
    const objectsToClean = [
      {
        name: 'ПепсиКо',
        wrongComments: [
          '2 очередь', '3 очередь', '5 очередь', 'Желябово',
          'по уборке внутренней территории', 'менеджер по уборке внешней территории',
          '2,3 очередь'
        ]
      },
      {
        name: 'БЦ «Сфера',
        wrongComments: [
          '2 очередь', '3 очередь', '5 очередь', 'Желябово',
          'по уборке внутренней территории', 'менеджер по уборке внешней территории'
        ]
      }
    ];
    
    let totalDeleted = 0;
    
    for (const objInfo of objectsToClean) {
      console.log(`🔍 Очищаем объект: ${objInfo.name}`);
      
      // Находим объект
      const objects = await prisma.cleaningObject.findMany({
        where: {
          name: {
            contains: objInfo.name,
            mode: 'insensitive'
          }
        },
        include: {
          sites: {
            where: {
              comment: {
                in: objInfo.wrongComments
              }
            }
          }
        }
      });
      
      for (const object of objects) {
        console.log(`   📋 Объект: ${object.name} (ID: ${object.id})`);
        console.log(`   🗑️ Неправильных участков: ${object.sites.length}`);
        
        if (object.sites.length > 0) {
          // Удаляем неправильные участки
          const deletedSites = await prisma.site.deleteMany({
            where: {
              id: {
                in: object.sites.map(site => site.id)
              }
            }
          });
          
          console.log(`   ✅ Удалено участков: ${deletedSites.count}`);
          totalDeleted += deletedSites.count;
          
          // Показываем, что удалили
          object.sites.forEach(site => {
            console.log(`      - ${site.name} (${site.comment})`);
          });
        } else {
          console.log(`   ✅ Неправильных участков не найдено`);
        }
      }
    }
    
    console.log(`\n📊 ИТОГО УДАЛЕНО НЕПРАВИЛЬНЫХ УЧАСТКОВ: ${totalDeleted}`);
    
    // Дополнительная очистка - удаляем участки без менеджеров у проблемных объектов
    console.log('\n🔍 Дополнительная очистка участков без менеджеров...');
    
    const problemObjects = ['ПепсиКо', 'Юг-сервис', 'ЭЛЕКТРОЩИТ'];
    let totalEmptyDeleted = 0;
    
    for (const objName of problemObjects) {
      const objects = await prisma.cleaningObject.findMany({
        where: {
          name: {
            contains: objName,
            mode: 'insensitive'
          }
        }
      });
      
      for (const object of objects) {
        // Находим участки без менеджеров и без важных комментариев
        const emptySites = await prisma.site.findMany({
          where: {
            objectId: object.id,
            managerId: null,
            OR: [
              { comment: null },
              { comment: '' },
              { 
                comment: {
                  notIn: [
                    'старший менеджер', 'ул. 5 квартал,3а', 'ул. Мяги,10а',
                    'Русский трансформатор и остальные участки на Красной Глинке',
                    'Заводоуправление и Инжиниринг, стадион Энергия',
                    '2 очередь', '3 очередь', '5 очередь', 'Желябово'
                  ]
                }
              }
            ]
          }
        });
        
        if (emptySites.length > 0) {
          console.log(`   🗑️ ${object.name}: удаляем ${emptySites.length} пустых участков`);
          
          const deletedEmpty = await prisma.site.deleteMany({
            where: {
              id: {
                in: emptySites.map(site => site.id)
              }
            }
          });
          
          totalEmptyDeleted += deletedEmpty.count;
        }
      }
    }
    
    console.log(`📊 УДАЛЕНО ПУСТЫХ УЧАСТКОВ: ${totalEmptyDeleted}`);
    
    // Финальная проверка
    console.log('\n📋 ФИНАЛЬНАЯ ПРОВЕРКА ПОСЛЕ ОЧИСТКИ:');
    
    const finalCheck = await prisma.cleaningObject.findMany({
      where: {
        OR: [
          { name: { contains: 'ПепсиКо', mode: 'insensitive' } },
          { name: { contains: 'Юг-сервис', mode: 'insensitive' } },
          { name: { contains: 'ЭЛЕКТРОЩИТ', mode: 'insensitive' } }
        ]
      },
      include: {
        manager: { select: { name: true } },
        sites: {
          where: { managerId: { not: null } },
          include: { manager: { select: { name: true } } }
        },
        _count: { select: { sites: true } }
      }
    });
    
    finalCheck.forEach(obj => {
      console.log(`\n✅ ${obj.name}`);
      console.log(`   Основной менеджер: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Всего участков: ${obj._count.sites}`);
      console.log(`   Участков с менеджерами: ${obj.sites.length}`);
      
      obj.sites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.comment || site.name}: ${site.manager?.name}`);
      });
    });
    
  } catch (error) {
    console.error('💥 Ошибка при очистке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupWrongAssignments();
