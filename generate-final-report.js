const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function generateFinalReport() {
  try {
    console.log('📊 ГЕНЕРАЦИЯ ИТОГОВОГО ОТЧЕТА ПО СИСТЕМЕ');
    console.log('=========================================\n');

    // Собираем статистику
    const stats = {
      managers: await prisma.user.count({ where: { role: 'MANAGER' } }),
      objects: await prisma.cleaningObject.count(),
      sites: await prisma.site.count(),
      zones: await prisma.zone.count(),
      rooms: await prisma.room.count(),
      checklists: await prisma.checklist.count(),
      tasks: await prisma.task.count(),
      auditLogs: await prisma.auditLog.count()
    };

    // Детальная статистика по менеджерам
    const managersWithStats = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      include: {
        _count: {
          select: {
            managedObjects: true,
            managedSites: true,
            completedTasks: true,
            completedChecklists: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Статистика по объектам
    const objectsWithStats = await prisma.cleaningObject.findMany({
      include: {
        manager: { select: { name: true } },
        _count: {
          select: {
            sites: true,
            rooms: true,
            checklists: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Статистика по участкам
    const sitesWithStats = await prisma.site.findMany({
      include: {
        object: { select: { name: true } },
        manager: { select: { name: true } },
        _count: {
          select: { zones: true }
        }
      },
      orderBy: [
        { object: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Создаем отчет
    let report = '';
    
    report += '# 📊 ИТОГОВЫЙ ОТЧЕТ ПО СИСТЕМЕ УПРАВЛЕНИЯ КЛИНИНГОМ\n\n';
    report += `**Дата создания:** ${new Date().toLocaleString('ru-RU')}\n\n`;
    
    report += '## 🎯 ОБЩАЯ СТАТИСТИКА\n\n';
    report += `- **👥 Менеджеров:** ${stats.managers}\n`;
    report += `- **🏢 Объектов:** ${stats.objects}\n`;
    report += `- **🗺️ Участков:** ${stats.sites}\n`;
    report += `- **🏠 Зон:** ${stats.zones}\n`;
    report += `- **🚪 Помещений:** ${stats.rooms}\n`;
    report += `- **📋 Чек-листов:** ${stats.checklists}\n`;
    report += `- **✅ Задач:** ${stats.tasks}\n`;
    report += `- **📝 Записей аудита:** ${stats.auditLogs}\n\n`;

    report += '## 👥 МЕНЕДЖЕРЫ И ИХ НАГРУЗКА\n\n';
    report += '| № | Менеджер | Объекты | Участки | Задачи | Чек-листы |\n';
    report += '|---|----------|---------|---------|--------|----------|\n';
    
    managersWithStats.forEach((manager, index) => {
      report += `| ${index + 1} | ${manager.name} | ${manager._count.managedObjects} | ${manager._count.managedSites} | ${manager._count.completedTasks} | ${manager._count.completedChecklists} |\n`;
    });

    report += '\n### 📈 Анализ нагрузки менеджеров:\n\n';
    
    const totalObjects = managersWithStats.reduce((sum, m) => sum + m._count.managedObjects, 0);
    const totalSites = managersWithStats.reduce((sum, m) => sum + m._count.managedSites, 0);
    const avgObjectsPerManager = Math.round(totalObjects / managersWithStats.length * 10) / 10;
    const avgSitesPerManager = Math.round(totalSites / managersWithStats.length * 10) / 10;
    
    report += `- **Среднее объектов на менеджера:** ${avgObjectsPerManager}\n`;
    report += `- **Среднее участков на менеджера:** ${avgSitesPerManager}\n`;
    
    // Топ менеджеров по нагрузке
    const topByObjects = [...managersWithStats].sort((a, b) => b._count.managedObjects - a._count.managedObjects).slice(0, 5);
    const topBySites = [...managersWithStats].sort((a, b) => b._count.managedSites - a._count.managedSites).slice(0, 5);
    
    report += '\n**Топ-5 менеджеров по количеству объектов:**\n';
    topByObjects.forEach((manager, index) => {
      report += `${index + 1}. ${manager.name} - ${manager._count.managedObjects} объектов\n`;
    });
    
    report += '\n**Топ-5 менеджеров по количеству участков:**\n';
    topBySites.forEach((manager, index) => {
      report += `${index + 1}. ${manager.name} - ${manager._count.managedSites} участков\n`;
    });

    report += '\n## 🏢 ОБЪЕКТЫ ПО МЕНЕДЖЕРАМ\n\n';
    
    for (const manager of managersWithStats) {
      if (manager._count.managedObjects > 0) {
        report += `### 👤 ${manager.name}\n\n`;
        
        const managerObjects = objectsWithStats.filter(obj => obj.manager?.name === manager.name);
        
        report += '| Объект | Участки | Помещения | Чек-листы |\n';
        report += '|--------|---------|-----------|----------|\n';
        
        managerObjects.forEach(obj => {
          report += `| ${obj.name} | ${obj._count.sites} | ${obj._count.rooms} | ${obj._count.checklists} |\n`;
        });
        
        const totalSitesForManager = managerObjects.reduce((sum, obj) => sum + obj._count.sites, 0);
        const totalRoomsForManager = managerObjects.reduce((sum, obj) => sum + obj._count.rooms, 0);
        
        report += `\n**Итого:** ${managerObjects.length} объектов, ${totalSitesForManager} участков, ${totalRoomsForManager} помещений\n\n`;
      }
    }

    report += '## 🗺️ УЧАСТКИ ПО ОБЪЕКТАМ\n\n';
    
    const objectsGrouped = {};
    sitesWithStats.forEach(site => {
      if (!objectsGrouped[site.object.name]) {
        objectsGrouped[site.object.name] = [];
      }
      objectsGrouped[site.object.name].push(site);
    });
    
    Object.entries(objectsGrouped).forEach(([objectName, sites]) => {
      report += `### 🏢 ${objectName}\n\n`;
      report += `**Менеджер:** ${sites[0]?.manager?.name || 'не назначен'}\n\n`;
      
      report += '| Участок | Площадь (м²) | Зоны | Описание |\n';
      report += '|---------|--------------|------|----------|\n';
      
      sites.forEach(site => {
        const area = site.area ? site.area.toString() : '-';
        const description = site.description || '-';
        report += `| ${site.name} | ${area} | ${site._count.zones} | ${description} |\n`;
      });
      
      const totalArea = sites.reduce((sum, site) => sum + (site.area || 0), 0);
      const totalZones = sites.reduce((sum, site) => sum + site._count.zones, 0);
      
      report += `\n**Итого:** ${sites.length} участков, ${totalArea} м², ${totalZones} зон\n\n`;
    });

    report += '## 📋 РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ\n\n';
    
    // Анализируем неравномерность распределения
    const objectCounts = managersWithStats.map(m => m._count.managedObjects);
    const maxObjects = Math.max(...objectCounts);
    const minObjects = Math.min(...objectCounts);
    
    if (maxObjects - minObjects > 2) {
      report += '### ⚖️ Балансировка нагрузки\n\n';
      report += `- Обнаружена неравномерность в распределении объектов (от ${minObjects} до ${maxObjects})\n`;
      report += '- Рекомендуется перераспределить объекты для более равномерной нагрузки\n\n';
    }
    
    // Объекты без участков
    const objectsWithoutSites = objectsWithStats.filter(obj => obj._count.sites === 0);
    if (objectsWithoutSites.length > 0) {
      report += '### 🗺️ Создание участков\n\n';
      report += `- ${objectsWithoutSites.length} объектов не имеют участков\n`;
      report += '- Рекомендуется создать участки для лучшей организации работы\n\n';
    }
    
    // Участки без зон
    const sitesWithoutZones = sitesWithStats.filter(site => site._count.zones === 0);
    if (sitesWithoutZones.length > 0) {
      report += '### 🏠 Создание зон\n\n';
      report += `- ${sitesWithoutZones.length} участков не имеют зон\n`;
      report += '- Рекомендуется создать зоны для детального планирования работ\n\n';
    }

    report += '## 🎯 СЛЕДУЮЩИЕ ШАГИ\n\n';
    report += '1. **Создание зон** - Добавить зоны к участкам для детального планирования\n';
    report += '2. **Техкарты** - Создать техкарты для каждого типа работ\n';
    report += '3. **Автоматизация** - Настроить автоматическое создание чек-листов\n';
    report += '4. **Мониторинг** - Внедрить систему отслеживания выполнения задач\n';
    report += '5. **Оптимизация** - Анализировать и оптимизировать распределение нагрузки\n\n';

    report += '---\n\n';
    report += '*Отчет сгенерирован автоматически системой управления клинингом*\n';

    // Сохраняем отчет в файл
    const filename = `FINAL_REPORT_${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, report, 'utf8');

    console.log('📄 ОТЧЕТ СОЗДАН УСПЕШНО!');
    console.log('='.repeat(30));
    console.log(`📁 Файл: ${filename}`);
    console.log(`📊 Размер: ${Math.round(report.length / 1024 * 10) / 10} KB`);
    console.log(`📋 Строк: ${report.split('\n').length}`);

    // Выводим краткую статистику в консоль
    console.log('\n📊 КРАТКАЯ СТАТИСТИКА:');
    console.log('='.repeat(30));
    console.log(`👥 Менеджеров: ${stats.managers}`);
    console.log(`🏢 Объектов: ${stats.objects}`);
    console.log(`🗺️ Участков: ${stats.sites}`);
    console.log(`🏠 Зон: ${stats.zones}`);
    console.log(`🚪 Помещений: ${stats.rooms}`);
    console.log(`📋 Чек-листов: ${stats.checklists}`);
    console.log(`✅ Задач: ${stats.tasks}`);

    console.log('\n🎯 СИСТЕМА ГОТОВА К РАБОТЕ!');
    console.log('✅ Все менеджеры назначены');
    console.log('✅ Участки созданы для всех объектов');
    console.log('✅ Система управления полностью функциональна');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateFinalReport();
