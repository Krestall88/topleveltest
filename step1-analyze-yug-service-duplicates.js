const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeYugServiceDuplicates() {
  console.log('🔍 АНАЛИЗ ДУБЛИРОВАНИЯ ЮГ-СЕРВИСА\n');
  
  try {
    // Ищем все объекты с "Юг-сервис" в названии
    const yugObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true }
        },
        sites: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        rooms: true,
        techCards: true,
        checklists: true,
        _count: {
          select: {
            sites: true,
            rooms: true,
            techCards: true,
            checklists: true
          }
        }
      }
    });
    
    console.log(`Найдено объектов с "Юг-сервис": ${yugObjects.length}\n`);
    
    yugObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ОБЪЕКТ: ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Создан: ${obj.createdAt}`);
      console.log(`   Основной менеджер: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Статистика:`);
      console.log(`     - Участков: ${obj._count.sites}`);
      console.log(`     - Помещений: ${obj._count.rooms}`);
      console.log(`     - Техкарт: ${obj._count.techCards}`);
      console.log(`     - Чек-листов: ${obj._count.checklists}`);
      
      // Показываем участки с менеджерами
      const sitesWithManagers = obj.sites.filter(site => site.managerId);
      console.log(`   Участков с менеджерами: ${sitesWithManagers.length}`);
      
      if (sitesWithManagers.length > 0) {
        console.log(`   Менеджеры по участкам:`);
        sitesWithManagers.forEach((site, siteIndex) => {
          console.log(`     ${siteIndex + 1}. ${site.name} → ${site.manager?.name} (${site.comment || 'без комментария'})`);
        });
      }
      
      console.log(`   Всего участков: ${obj.sites.length}`);
      console.log(`   Всего помещений: ${obj.rooms.length}`);
      console.log('   ─────────────────────────────────────────\n');
    });
    
    // Рекомендации по удалению
    console.log('📋 РЕКОМЕНДАЦИИ:');
    
    if (yugObjects.length > 1) {
      // Находим объект с максимальной структурой
      const objectWithMostData = yugObjects.reduce((prev, current) => {
        const prevScore = prev._count.sites + prev._count.rooms + prev._count.techCards + (prev.manager ? 10 : 0);
        const currentScore = current._count.sites + current._count.rooms + current._count.techCards + (current.manager ? 10 : 0);
        return currentScore > prevScore ? current : prev;
      });
      
      console.log(`✅ ОСТАВИТЬ: ${objectWithMostData.name} (ID: ${objectWithMostData.id})`);
      console.log(`   Причина: максимум данных (${objectWithMostData._count.sites} участков, ${objectWithMostData._count.rooms} помещений, ${objectWithMostData._count.techCards} техкарт)`);
      
      const objectsToDelete = yugObjects.filter(obj => obj.id !== objectWithMostData.id);
      
      console.log(`\n🗑️ УДАЛИТЬ:`);
      objectsToDelete.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name} (ID: ${obj.id})`);
        console.log(`      Причина: меньше данных (${obj._count.sites} участков, ${obj._count.rooms} помещений, ${obj._count.techCards} техкарт)`);
        
        // Проверяем, есть ли уникальные данные, которые нужно перенести
        const sitesWithManagers = obj.sites.filter(site => site.managerId);
        if (sitesWithManagers.length > 0) {
          console.log(`      ⚠️ ВНИМАНИЕ: Есть ${sitesWithManagers.length} участков с менеджерами - нужно перенести!`);
          sitesWithManagers.forEach(site => {
            console.log(`         - ${site.name}: ${site.manager?.name} (${site.comment})`);
          });
        }
      });
    } else {
      console.log('✅ Дублирования не обнаружено');
    }
    
  } catch (error) {
    console.error('💥 Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeYugServiceDuplicates();
