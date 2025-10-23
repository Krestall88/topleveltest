const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function compareManagersData() {
  try {
    console.log('🔍 СРАВНЕНИЕ ДАННЫХ МЕНЕДЖЕРОВ И ОБЪЕКТОВ\n');

    // Загружаем распарсенные данные
    const newData = JSON.parse(fs.readFileSync('parsed-managers-data.json', 'utf8'));

    // Получаем текущих менеджеров из БД
    const currentManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      }
    });

    // Получаем текущие объекты из БД
    const currentObjects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        manager: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    console.log('📊 СРАВНЕНИЕ МЕНЕДЖЕРОВ:');
    console.log('='.repeat(70));

    // Анализ менеджеров
    const newManagersMap = new Map(newData.managers.map(m => [m.name, m]));
    const currentManagersMap = new Map(currentManagers.map(m => [m.name, m]));

    const managersToAdd = [];
    const managersToUpdate = [];
    const managersInBoth = [];

    // Проверяем новых менеджеров
    newData.managers.forEach(newManager => {
      const current = currentManagersMap.get(newManager.name);
      if (!current) {
        managersToAdd.push(newManager);
      } else {
        managersInBoth.push({ new: newManager, current });
        // Проверяем телефон
        if (current.phone !== newManager.phone) {
          managersToUpdate.push({
            name: newManager.name,
            currentPhone: current.phone,
            newPhone: newManager.phone
          });
        }
      }
    });

    // Менеджеры только в БД
    const managersOnlyInDB = currentManagers.filter(m => !newManagersMap.has(m.name));

    console.log('✅ МЕНЕДЖЕРЫ В ОБЕИХ СИСТЕМАХ:');
    managersInBoth.forEach((item, index) => {
      console.log(`${index + 1}. ${item.new.name}`);
      console.log(`   📱 Телефон: ${item.current.phone} ${item.current.phone === item.new.phone ? '✓' : '→ ' + item.new.phone}`);
    });

    console.log('\n🆕 НОВЫЕ МЕНЕДЖЕРЫ (нужно добавить):');
    managersToAdd.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   📱 ${manager.phone}`);
      console.log(`   🏢 Объектов: ${manager.objects.length}`);
    });

    console.log('\n📝 МЕНЕДЖЕРЫ С ОБНОВЛЕННЫМИ ТЕЛЕФОНАМИ:');
    managersToUpdate.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   📱 ${manager.currentPhone} → ${manager.newPhone}`);
    });

    console.log('\n❓ МЕНЕДЖЕРЫ ТОЛЬКО В БД (возможно удалить):');
    managersOnlyInDB.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   📱 ${manager.phone || 'не указан'}`);
      console.log(`   📧 ${manager.email}`);
    });

    console.log('\n\n🏢 АНАЛИЗ ОБЪЕКТОВ С НЕСКОЛЬКИМИ МЕНЕДЖЕРАМИ:');
    console.log('='.repeat(70));

    newData.multiManagerObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.company}`);
      console.log(`   👥 Менеджеры: ${obj.managers.length}`);
      
      obj.objects.forEach(objData => {
        console.log(`   - ${objData.manager}`);
        console.log(`     📍 Участок: ${objData.managerRole || 'основной'}`);
        console.log(`     📱 ${objData.managerPhone}`);
      });
      console.log('');
    });

    console.log('\n🎯 РЕКОМЕНДАЦИИ ПО ПРИВЯЗКЕ МЕНЕДЖЕРОВ:');
    console.log('='.repeat(70));

    // Анализируем спорные случаи
    const recommendations = [];

    newData.multiManagerObjects.forEach(obj => {
      if (obj.company.includes('Электрощит')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Создать участки: "Русский трансформатор и Красная Глинка" (Гайнуллина) и "Заводоуправление и Инжиниринг" (Исайчева)',
          managers: obj.managers,
          type: 'geographic_split'
        });
      } else if (obj.company.includes('Юг-сервис')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Создать участки по очередям: "2 очередь" (Штельмашенко), "3 очередь" (Шодиева), "5 очередь" (Халидова), "Желябово" (Будкова)',
          managers: obj.managers,
          type: 'area_split'
        });
      } else if (obj.company.includes('ПепсиКо')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Создать участки по адресам: "5 квартал,3а" (Ласкин), "ул. Мяги,10а" (Васекин), общее руководство (Исайчева как старший)',
          managers: obj.managers,
          type: 'address_split'
        });
      } else if (obj.company.includes('ЖилЭнерго')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Создать участки: "Внутренняя территория" (Галиев), "Внешняя территория" (Васекин)',
          managers: obj.managers,
          type: 'functional_split'
        });
      } else if (obj.company.includes('Инкатех')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Иерархия: Нувальцева (старший менеджер) + Кобзева (менеджер)',
          managers: obj.managers,
          type: 'hierarchy'
        });
      } else if (obj.company.includes('Маркет.Операции')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Иерархия: Штельмашенко (старший менеджер) + Гордеев (менеджер)',
          managers: obj.managers,
          type: 'hierarchy'
        });
      } else if (obj.company.includes('Тяжмаш')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Иерархия: Гайнуллина (старший менеджер) + Тимохина (менеджер)',
          managers: obj.managers,
          type: 'hierarchy'
        });
      } else if (obj.company.includes('Фарика Качества')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Иерархия: Исайчева (старший менеджер) + Крапивко (менеджер)',
          managers: obj.managers,
          type: 'hierarchy'
        });
      } else if (obj.company.includes('БЦ "Сфера"')) {
        recommendations.push({
          company: obj.company,
          suggestion: 'Создать участки по очередям: "2,3 очередь" (Штельмашенко), "5 очередь" (Халидова)',
          managers: obj.managers,
          type: 'area_split'
        });
      }
    });

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.company}`);
      console.log(`   💡 ${rec.suggestion}`);
      console.log(`   🏷️  Тип: ${rec.type}`);
      console.log(`   👥 Менеджеры: ${rec.managers.join(', ')}`);
      console.log('');
    });

    console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(50));
    console.log(`📊 Текущих менеджеров в БД: ${currentManagers.length}`);
    console.log(`📊 Новых менеджеров в списке: ${newData.managers.length}`);
    console.log(`➕ Менеджеров к добавлению: ${managersToAdd.length}`);
    console.log(`📝 Менеджеров к обновлению: ${managersToUpdate.length}`);
    console.log(`❓ Менеджеров только в БД: ${managersOnlyInDB.length}`);
    console.log(`🏢 Объектов с мульти-менеджерами: ${newData.multiManagerObjects.length}`);

    // Сохраняем результат анализа
    const analysisResult = {
      managersToAdd,
      managersToUpdate,
      managersOnlyInDB,
      recommendations,
      multiManagerObjects: newData.multiManagerObjects,
      statistics: {
        currentManagersCount: currentManagers.length,
        newManagersCount: newData.managers.length,
        toAddCount: managersToAdd.length,
        toUpdateCount: managersToUpdate.length,
        onlyInDBCount: managersOnlyInDB.length,
        multiManagerObjectsCount: newData.multiManagerObjects.length
      }
    };

    fs.writeFileSync('managers-analysis.json', JSON.stringify(analysisResult, null, 2), 'utf8');
    console.log('\n💾 Анализ сохранен в managers-analysis.json');

    return analysisResult;

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareManagersData();
