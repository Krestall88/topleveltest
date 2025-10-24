const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Только проблемные объекты, которые не были найдены в первом запуске
const failedAssignments = [
  {
    objectName: 'АО «ГК «Электрощит» -ТМ Самара»',
    dbObjectName: 'ЗАО «ГК «ЭЛЕКТРОЩИТ» ТМ САМАРА» 159 968.55 м2',
    managerName: 'Гайнуллина Айна Алиевна',
    comment: 'Русский трансформатор и остальные участки на Красной Глинке'
  },
  {
    objectName: 'АО «ГК «Электрощит» -ТМ Самара»',
    dbObjectName: 'ЗАО «ГК «ЭЛЕКТРОЩИТ» ТМ САМАРА» 159 968.55 м2',
    managerName: 'Исайчева Маргарита Николаевна',
    comment: 'Заводоуправление и Инжиниринг, стадион Энергия'
  },
  {
    objectName: 'ООО ЧОО «Гвардеец»',
    dbObjectName: 'ООО ЧОО Гвардеец',
    managerName: 'Гайнуллина Айна Алиевна',
    comment: ''
  },
  {
    objectName: 'ПАО "БыстроБанк"',
    dbObjectName: 'ПАО «БыстроБанк»',
    managerName: 'Ягода Ирина Александровна',
    comment: ''
  },
  {
    objectName: 'АО "Тяжмаш"',
    dbObjectName: 'Акционерное общество "ТЯЖМАШ" АО "ТЯЖМАШ',
    managerName: 'Тимохина Анна Анатольевна',
    comment: ''
  },
  {
    objectName: 'АО "Тяжмаш"',
    dbObjectName: 'Акционерное общество "ТЯЖМАШ" АО "ТЯЖМАШ',
    managerName: 'Гайнуллина Айна Алиевна',
    comment: 'старший менеджер'
  }
];

async function fixFailedAssignments() {
  console.log('🔧 Исправляем проблемные назначения менеджеров...');
  
  let successCount = 0;
  let errorCount = 0;
  let notFoundObjects = [];
  let notFoundManagers = [];
  
  try {
    for (const assignment of failedAssignments) {
      const { objectName, dbObjectName, managerName, comment } = assignment;
      
      console.log(`\n📋 Исправляем: ${objectName} → ${managerName}`);
      console.log(`   Ищем в БД как: "${dbObjectName}"`);
      
      try {
        // Ищем объект в БД с более гибким поиском
        let object = await prisma.cleaningObject.findFirst({
          where: {
            name: {
              contains: dbObjectName,
              mode: 'insensitive'
            }
          }
        });
        
        // Если не найден, пробуем поиск по частям названия
        if (!object) {
          console.log(`   🔍 Пробуем поиск по ключевым словам...`);
          
          let searchTerms = [];
          if (objectName.includes('Электрощит')) {
            searchTerms = ['ЭЛЕКТРОЩИТ', 'ТМ САМАРА'];
          } else if (objectName.includes('Гвардеец')) {
            searchTerms = ['Гвардеец'];
          } else if (objectName.includes('БыстроБанк')) {
            searchTerms = ['БыстроБанк'];
          } else if (objectName.includes('Тяжмаш')) {
            searchTerms = ['ТЯЖМАШ'];
          }
          
          for (const term of searchTerms) {
            object = await prisma.cleaningObject.findFirst({
              where: {
                name: {
                  contains: term,
                  mode: 'insensitive'
                }
              }
            });
            if (object) {
              console.log(`   ✅ Найден по ключевому слову "${term}": ${object.name}`);
              break;
            }
          }
        }
        
        if (!object) {
          console.log(`   ❌ Объект не найден даже по ключевым словам`);
          notFoundObjects.push(dbObjectName);
          errorCount++;
          continue;
        }
        
        // Ищем менеджера в БД
        const manager = await prisma.user.findFirst({
          where: {
            role: 'MANAGER',
            name: {
              contains: managerName,
              mode: 'insensitive'
            }
          }
        });
        
        if (!manager) {
          console.log(`   ❌ Менеджер не найден: ${managerName}`);
          notFoundManagers.push(managerName);
          errorCount++;
          continue;
        }
        
        // Проверяем, есть ли уже основной менеджер у объекта
        const existingMainManager = await prisma.cleaningObject.findUnique({
          where: { id: object.id },
          select: { managerId: true }
        });
        
        // Если это первое назначение для этого объекта, назначаем как основного менеджера
        const isFirstAssignmentForObject = failedAssignments.filter(a => a.objectName === objectName)[0] === assignment;
        
        if (isFirstAssignmentForObject && !existingMainManager.managerId) {
          // Назначаем основного менеджера объекта
          await prisma.cleaningObject.update({
            where: { id: object.id },
            data: { managerId: manager.id }
          });
          console.log(`   ✅ Назначен основной менеджер: ${manager.name}`);
        }
        
        // Создаем или обновляем участок с менеджером и комментарием
        if (comment) {
          const siteName = comment || `Участок ${managerName}`;
          
          // Проверяем, есть ли уже такой участок
          const existingSite = await prisma.site.findFirst({
            where: {
              objectId: object.id,
              name: siteName
            }
          });
          
          if (existingSite) {
            // Обновляем существующий участок
            await prisma.site.update({
              where: { id: existingSite.id },
              data: { 
                managerId: manager.id,
                comment: comment
              }
            });
            console.log(`   ✅ Обновлен участок: ${siteName} → ${manager.name}`);
          } else {
            // Создаем новый участок
            await prisma.site.create({
              data: {
                name: siteName,
                objectId: object.id,
                managerId: manager.id,
                comment: comment
              }
            });
            console.log(`   ✅ Создан участок: ${siteName} → ${manager.name}`);
          }
        } else {
          // Если нет комментария, но есть несколько менеджеров для объекта, создаем участок
          const allAssignmentsForObject = failedAssignments.filter(a => a.objectName === objectName);
          if (allAssignmentsForObject.length > 1) {
            const siteName = `Участок ${managerName}`;
            
            const existingSite = await prisma.site.findFirst({
              where: {
                objectId: object.id,
                managerId: manager.id
              }
            });
            
            if (!existingSite) {
              await prisma.site.create({
                data: {
                  name: siteName,
                  objectId: object.id,
                  managerId: manager.id,
                  comment: ''
                }
              });
              console.log(`   ✅ Создан участок: ${siteName} → ${manager.name}`);
            }
          }
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Ошибка при обработке ${objectName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 ИТОГИ ИСПРАВЛЕНИЯ:');
    console.log(`✅ Успешно исправлено: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    
    if (notFoundObjects.length > 0) {
      console.log('\n🔍 Все еще не найденные объекты:');
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

// Запускаем скрипт
fixFailedAssignments();
