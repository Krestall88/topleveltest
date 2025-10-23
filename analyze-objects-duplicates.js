const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeObjectsDuplicates() {
  try {
    console.log('🔍 АНАЛИЗ ДУБЛЕЙ ОБЪЕКТОВ');
    console.log('=========================\n');

    // Получаем все объекты с их структурой
    const allObjects = await prisma.cleaningObject.findMany({
      include: {
        manager: {
          select: { name: true }
        },
        _count: {
          select: {
            sites: true,
            rooms: true,
            checklists: true,
            techCards: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Всего объектов в системе: ${allObjects.length}\n`);

    // Группируем объекты по похожим названиям для поиска дублей
    const groupedObjects = {};
    
    allObjects.forEach(obj => {
      // Нормализуем название для группировки
      let normalizedName = obj.name
        .toLowerCase()
        .replace(/[«»"']/g, '"')
        .replace(/\s+/g, ' ')
        .replace(/\d+[\.,]?\d*\s*(кв\.?\s*м|м²).*$/i, '') // убираем площадь
        .replace(/\s*\(\s*.*?\s*\)\s*/g, '') // убираем скобки
        .replace(/\s*-\s*.*$/g, '') // убираем дефисы с описанием
        .trim();

      // Дополнительная нормализация для известных дублей
      if (normalizedName.includes('альфа')) normalizedName = 'альфа';
      if (normalizedName.includes('электрощит')) normalizedName = 'электрощит';
      if (normalizedName.includes('тяжмаш')) normalizedName = 'тяжмаш';
      if (normalizedName.includes('самараэнерго')) normalizedName = 'самараэнерго';
      if (normalizedName.includes('пепсико')) normalizedName = 'пепсико';
      if (normalizedName.includes('хлебозавод')) normalizedName = 'хлебозавод';
      if (normalizedName.includes('маркет')) normalizedName = 'маркет';
      if (normalizedName.includes('континент')) normalizedName = 'континент';
      if (normalizedName.includes('сфера')) normalizedName = 'сфера';
      if (normalizedName.includes('лопатинское')) normalizedName = 'лопатинское';
      if (normalizedName.includes('спартак')) normalizedName = 'спартак';
      if (normalizedName.includes('медицина')) normalizedName = 'медицина';
      if (normalizedName.includes('флагман')) normalizedName = 'флагман';
      if (normalizedName.includes('волгарь')) normalizedName = 'волгарь';
      if (normalizedName.includes('желдорпроект')) normalizedName = 'желдорпроект';
      if (normalizedName.includes('етэс')) normalizedName = 'етэс';

      if (!groupedObjects[normalizedName]) {
        groupedObjects[normalizedName] = [];
      }
      groupedObjects[normalizedName].push(obj);
    });

    // Находим группы с дублями
    const duplicateGroups = Object.entries(groupedObjects).filter(([key, objects]) => objects.length > 1);
    
    console.log('🔍 НАЙДЕННЫЕ ДУБЛИ:');
    console.log('='.repeat(50));
    
    let totalDuplicates = 0;
    let duplicatesToRemove = [];

    duplicateGroups.forEach(([groupName, objects], index) => {
      console.log(`\n${index + 1}. Группа "${groupName}" (${objects.length} объектов):`);
      
      objects.forEach((obj, objIndex) => {
        console.log(`   ${objIndex + 1}. ${obj.name}`);
        console.log(`      ID: ${obj.id}`);
        console.log(`      Менеджер: ${obj.manager?.name || 'не назначен'}`);
        console.log(`      Участки: ${obj._count.sites}, Помещения: ${obj._count.rooms}`);
        console.log(`      Чек-листы: ${obj._count.checklists}, Техкарты: ${obj._count.techCards}`);
        
        // Определяем структуру объекта
        if (obj._count.sites > 0 && obj._count.rooms > 0) {
          console.log(`      📊 Структура: МНОГОУРОВНЕВАЯ (участки + помещения)`);
        } else if (obj._count.sites > 0) {
          console.log(`      📊 Структура: УЧАСТКИ`);
        } else if (obj._count.rooms > 0) {
          console.log(`      📊 Структура: ПОМЕЩЕНИЯ`);
        } else {
          console.log(`      📊 Структура: ПУСТАЯ`);
        }
      });

      // Определяем, какие объекты оставить, а какие удалить
      // Приоритет: многоуровневая структура > участки > помещения > пустая
      const sortedObjects = [...objects].sort((a, b) => {
        const scoreA = (a._count.sites > 0 ? 100 : 0) + (a._count.rooms > 0 ? 50 : 0) + 
                      (a._count.checklists > 0 ? 10 : 0) + (a._count.techCards > 0 ? 5 : 0);
        const scoreB = (b._count.sites > 0 ? 100 : 0) + (b._count.rooms > 0 ? 50 : 0) + 
                      (b._count.checklists > 0 ? 10 : 0) + (b._count.techCards > 0 ? 5 : 0);
        return scoreB - scoreA;
      });

      const keepObject = sortedObjects[0];
      const removeObjects = sortedObjects.slice(1);

      console.log(`   ✅ ОСТАВИТЬ: ${keepObject.name} (лучшая структура)`);
      removeObjects.forEach(obj => {
        console.log(`   🗑️  УДАЛИТЬ: ${obj.name}`);
        duplicatesToRemove.push(obj);
      });

      totalDuplicates += objects.length - 1;
    });

    console.log(`\n📊 ИТОГО ДУБЛЕЙ: ${totalDuplicates}`);
    console.log(`📊 ОБЪЕКТОВ К УДАЛЕНИЮ: ${duplicatesToRemove.length}`);
    console.log(`📊 ОСТАНЕТСЯ ОБЪЕКТОВ: ${allObjects.length - duplicatesToRemove.length}`);

    // Показываем уникальные объекты (без дублей)
    const uniqueGroups = Object.entries(groupedObjects).filter(([key, objects]) => objects.length === 1);
    console.log(`\n✅ УНИКАЛЬНЫЕ ОБЪЕКТЫ: ${uniqueGroups.length}`);

    // Проверяем, соответствует ли это ожидаемым 29 объектам
    const expectedTotal = uniqueGroups.length + duplicateGroups.length;
    console.log(`\n🎯 ОЖИДАЕМОЕ КОЛИЧЕСТВО ПОСЛЕ ОЧИСТКИ: ${expectedTotal}`);
    
    if (expectedTotal === 29) {
      console.log('✅ Это соответствует ожидаемым 29 объектам!');
    } else {
      console.log(`⚠️  Не соответствует ожидаемым 29 объектам (разница: ${expectedTotal - 29})`);
    }

    // Показываем план удаления
    console.log('\n📋 ПЛАН УДАЛЕНИЯ ДУБЛЕЙ:');
    console.log('='.repeat(40));
    
    duplicatesToRemove.forEach((obj, index) => {
      console.log(`${index + 1}. Удалить: ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Причина: дубль, есть лучший вариант`);
    });

    // Сохраняем список для удаления
    const removalData = {
      totalObjects: allObjects.length,
      expectedAfterCleanup: expectedTotal,
      duplicatesToRemove: duplicatesToRemove.map(obj => ({
        id: obj.id,
        name: obj.name,
        sites: obj._count.sites,
        rooms: obj._count.rooms,
        checklists: obj._count.checklists,
        techCards: obj._count.techCards
      }))
    };

    require('fs').writeFileSync('objects-cleanup-plan.json', JSON.stringify(removalData, null, 2));
    console.log('\n💾 План очистки сохранен в objects-cleanup-plan.json');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeObjectsDuplicates();
