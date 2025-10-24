const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixManagerAssignments() {
  console.log('🔧 Исправляем назначения менеджеров...\n');
  
  try {
    // 1. Исправляем Юг-сервис - назначаем основного менеджера на второй объект
    console.log('📋 Исправляем Юг-сервис...');
    
    const yugObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      }
    });
    
    // Находим объект без основного менеджера
    const yugWithoutManager = yugObjects.find(obj => !obj.managerId);
    if (yugWithoutManager) {
      // Назначаем Штельмашенко как основного менеджера
      const shtelmashenkoManager = await prisma.user.findFirst({
        where: {
          name: {
            contains: 'Штельмашенко Ирина',
            mode: 'insensitive'
          }
        }
      });
      
      if (shtelmashenkoManager) {
        await prisma.cleaningObject.update({
          where: { id: yugWithoutManager.id },
          data: { managerId: shtelmashenkoManager.id }
        });
        console.log(`✅ Назначен основной менеджер на ${yugWithoutManager.name}: ${shtelmashenkoManager.name}`);
      }
    }
    
    // 2. Исправляем ПепсиКо - удаляем лишние участки и оставляем только правильные
    console.log('\n📋 Исправляем ПепсиКо...');
    
    const pepsiObject = await prisma.cleaningObject.findFirst({
      where: {
        name: {
          contains: 'ПепсиКо',
          mode: 'insensitive'
        }
      },
      include: {
        sites: true
      }
    });
    
    if (pepsiObject) {
      // Удаляем все неправильные участки (которые не относятся к ПепсиКо)
      const wrongSites = pepsiObject.sites.filter(site => 
        site.comment && (
          site.comment.includes('очередь') || 
          site.comment.includes('Желябово') ||
          site.comment.includes('внутренней территории') ||
          site.comment.includes('внешней территории')
        )
      );
      
      for (const site of wrongSites) {
        await prisma.site.delete({
          where: { id: site.id }
        });
        console.log(`🗑️ Удален неправильный участок: ${site.name} (${site.comment})`);
      }
      
      // Проверяем, есть ли правильные участки ПепсиКо
      const correctSites = await prisma.site.findMany({
        where: {
          objectId: pepsiObject.id,
          comment: {
            in: ['старший менеджер', 'ул. 5 квартал,3а', 'ул. Мяги,10а']
          }
        }
      });
      
      console.log(`✅ Правильных участков ПепсиКо: ${correctSites.length}`);
      correctSites.forEach(site => {
        console.log(`   - ${site.name}: ${site.comment}`);
      });
    }
    
    // 3. Создаем недостающие участки для ПепсиКо если их нет
    console.log('\n📋 Проверяем участки ПепсиКо...');
    
    const pepsiAssignments = [
      {
        managerName: 'Исайчева Маргарита Николаевна',
        comment: 'старший менеджер',
        siteName: 'старший менеджер'
      },
      {
        managerName: 'Ласкин Павел Александрович', 
        comment: 'ул. 5 квартал,3а',
        siteName: 'ул. 5 квартал,3а'
      },
      {
        managerName: 'Васекин Александр Александрович',
        comment: 'ул. Мяги,10а', 
        siteName: 'ул. Мяги,10а'
      }
    ];
    
    for (const assignment of pepsiAssignments) {
      const manager = await prisma.user.findFirst({
        where: {
          name: {
            contains: assignment.managerName,
            mode: 'insensitive'
          }
        }
      });
      
      if (manager && pepsiObject) {
        // Проверяем, есть ли уже такой участок
        const existingSite = await prisma.site.findFirst({
          where: {
            objectId: pepsiObject.id,
            comment: assignment.comment
          }
        });
        
        if (!existingSite) {
          // Создаем участок
          await prisma.site.create({
            data: {
              name: assignment.siteName,
              objectId: pepsiObject.id,
              managerId: manager.id,
              comment: assignment.comment
            }
          });
          console.log(`✅ Создан участок ПепсиКо: ${assignment.siteName} → ${manager.name}`);
        } else if (!existingSite.managerId) {
          // Обновляем участок если нет менеджера
          await prisma.site.update({
            where: { id: existingSite.id },
            data: { managerId: manager.id }
          });
          console.log(`✅ Обновлен участок ПепсиКо: ${assignment.siteName} → ${manager.name}`);
        }
      }
    }
    
    // 4. Проверяем и исправляем Электрощит
    console.log('\n📋 Проверяем Электрощит...');
    
    const electroObject = await prisma.cleaningObject.findFirst({
      where: {
        name: {
          contains: 'ЭЛЕКТРОЩИТ',
          mode: 'insensitive'
        }
      },
      include: {
        sites: {
          include: {
            manager: true
          }
        }
      }
    });
    
    if (electroObject) {
      const sitesWithManagers = electroObject.sites.filter(site => site.managerId);
      console.log(`✅ Электрощит: ${sitesWithManagers.length} участков с менеджерами`);
      sitesWithManagers.forEach(site => {
        console.log(`   - ${site.comment}: ${site.manager?.name}`);
      });
    }
    
    // 5. Финальная проверка
    console.log('\n📊 ФИНАЛЬНАЯ ПРОВЕРКА:');
    
    // Юг-сервис
    const yugFinal = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      include: {
        manager: true,
        sites: {
          where: { managerId: { not: null } },
          include: { manager: true }
        }
      }
    });
    
    yugFinal.forEach((obj, index) => {
      console.log(`\n${index + 1}. ${obj.name}`);
      console.log(`   Основной: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Участков с менеджерами: ${obj.sites.length}`);
    });
    
    // ПепсиКо
    const pepsiFinal = await prisma.cleaningObject.findFirst({
      where: {
        name: {
          contains: 'ПепсиКо',
          mode: 'insensitive'
        }
      },
      include: {
        manager: true,
        sites: {
          where: { managerId: { not: null } },
          include: { manager: true }
        }
      }
    });
    
    if (pepsiFinal) {
      console.log(`\n📦 ${pepsiFinal.name}`);
      console.log(`   Основной: ${pepsiFinal.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Участков с менеджерами: ${pepsiFinal.sites.length}`);
      pepsiFinal.sites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.comment}: ${site.manager?.name}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixManagerAssignments();
