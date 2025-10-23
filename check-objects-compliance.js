const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkObjectsCompliance() {
  try {
    console.log('🔍 ПРОВЕРКА СООТВЕТСТВИЯ ОБЪЕКТОВ В БАЗЕ');
    console.log('=======================================\n');

    // Эталонный список объектов
    const referenceObjects = [
      'ООО "БЦ «Сфера"',
      'Волгарь(ЖилЭнерго,ЖЭУ-66)',
      'ООО фирма «Нектар»',
      'ООО «УК «Амонд-ЖилКомСервис»',
      'ОАО «Самарский хлебозавод №5»',
      'МБУ «Лопатинское»',
      'Общество с ограниченной ответственностью «Единые Транспортные ЭнергоСистемы» (ООО «ЕТЭС»)',
      'ООО «ИНКАТЕХ»',
      'Индивидуальный предприниматель Широков Дмитрий Владимирович автосервиса (площадь 245 м2)',
      'КОМПАКТИВ',
      'Медицина АльфаСтрахования МедАС 2232,6 м2',
      'ООО «НЛ Континент» 144,2 м2',
      'ООО «Маркет.Операции» 26188,60 м2',
      'ООО ЧОО Гвардеец',
      'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «Электрощит-Инжиниринг» 407,2м2',
      'Пепси 1 515 кв. м.',
      '«Желдорпроект Поволжья»',
      'филиала АО «Росжелдорпроект» 1302,5 кв. м',
      'Самараэнерго 429,2 кв. м.',
      'Товарищество собственников жилья «Спартак» (ТСЖ «Спартак»)',
      'Акционерное общество "ТЯЖМАШ" АО "ТЯЖМАШ"',
      'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»',
      'ЗАО «ГК «ЭЛЕКТРОЩИТ» ТМ САМАРА» 159 968.55 м2',
      'ПАО «БыстроБанк»',
      'ООО 42 45,20 М2',
      'ООО «Альфа» 1100 м2',
      'ФГБОУ ВО СамГМУ Минздрава России',
      'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «ФЛАГМАН» (ООО «ФЛАГМАН»)',
      'УФПСО санаторий «Красная Глинка»',
      'УК Юг-сервис'
    ];

    console.log(`📋 Эталонный список: ${referenceObjects.length} объектов\n`);

    // Получаем все объекты из базы
    const dbObjects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        _count: {
          select: {
            objectStructures: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`💾 В базе данных: ${dbObjects.length} объектов\n`);

    // Функция для нормализации названий (убираем лишние пробелы, приводим к единому виду)
    function normalizeObjectName(name) {
      return name
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/«/g, '«')
        .replace(/»/g, '»')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    // Создаем нормализованные версии эталонного списка
    const normalizedReference = referenceObjects.map(name => ({
      original: name,
      normalized: normalizeObjectName(name)
    }));

    // Создаем нормализованные версии объектов из базы
    const normalizedDb = dbObjects.map(obj => ({
      id: obj.id,
      original: obj.name,
      normalized: normalizeObjectName(obj.name),
      address: obj.address,
      techCardsCount: obj._count.objectStructures
    }));

    console.log('✅ НАЙДЕННЫЕ СООТВЕТСТВИЯ:');
    console.log('==========================');
    
    let foundCount = 0;
    const foundObjects = [];
    const notFoundObjects = [];

    normalizedReference.forEach((refObj, index) => {
      // Ищем точное соответствие
      let found = normalizedDb.find(dbObj => dbObj.normalized === refObj.normalized);
      
      // Если не найдено точное соответствие, ищем частичное
      if (!found) {
        found = normalizedDb.find(dbObj => {
          const refWords = refObj.normalized.split(' ').filter(w => w.length > 2);
          const dbWords = dbObj.normalized.split(' ').filter(w => w.length > 2);
          
          // Проверяем, содержит ли название из БД ключевые слова из эталона
          return refWords.some(refWord => dbWords.some(dbWord => 
            dbWord.includes(refWord) || refWord.includes(dbWord)
          ));
        });
      }

      if (found) {
        foundCount++;
        foundObjects.push({
          reference: refObj.original,
          database: found.original,
          techCards: found.techCardsCount,
          id: found.id
        });
        console.log(`${index + 1}. ✅ "${refObj.original}"`);
        console.log(`    → В БД: "${found.original}" (${found.techCardsCount} техкарт)`);
        console.log(`    → ID: ${found.id}\n`);
      } else {
        notFoundObjects.push(refObj.original);
        console.log(`${index + 1}. ❌ "${refObj.original}" - НЕ НАЙДЕН\n`);
      }
    });

    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('========================');
    console.log(`✅ Найдено в базе: ${foundCount}/${referenceObjects.length}`);
    console.log(`❌ Не найдено: ${notFoundObjects.length}`);
    console.log(`📈 Процент соответствия: ${Math.round((foundCount / referenceObjects.length) * 100)}%\n`);

    if (notFoundObjects.length > 0) {
      console.log('❌ ОТСУТСТВУЮЩИЕ ОБЪЕКТЫ:');
      console.log('=========================');
      notFoundObjects.forEach((obj, index) => {
        console.log(`${index + 1}. ${obj}`);
      });
      console.log('');
    }

    // Проверяем объекты в базе, которых нет в эталонном списке
    const extraObjects = normalizedDb.filter(dbObj => {
      return !normalizedReference.some(refObj => {
        // Точное соответствие
        if (dbObj.normalized === refObj.normalized) return true;
        
        // Частичное соответствие
        const refWords = refObj.normalized.split(' ').filter(w => w.length > 2);
        const dbWords = dbObj.normalized.split(' ').filter(w => w.length > 2);
        
        return refWords.some(refWord => dbWords.some(dbWord => 
          dbWord.includes(refWord) || refWord.includes(dbWord)
        ));
      });
    });

    if (extraObjects.length > 0) {
      console.log('⚠️ ДОПОЛНИТЕЛЬНЫЕ ОБЪЕКТЫ В БАЗЕ:');
      console.log('=================================');
      extraObjects.forEach((obj, index) => {
        console.log(`${index + 1}. "${obj.original}" (${obj.techCardsCount} техкарт)`);
        console.log(`    → ID: ${obj.id}\n`);
      });
    }

    // Общая статистика по техкартам
    const totalTechCards = foundObjects.reduce((sum, obj) => sum + obj.techCards, 0);
    console.log('📋 СТАТИСТИКА ПО ТЕХКАРТАМ:');
    console.log('===========================');
    console.log(`🎯 Общее количество техкарт: ${totalTechCards}`);
    
    // Топ-5 объектов по количеству техкарт
    const topObjects = foundObjects
      .sort((a, b) => b.techCards - a.techCards)
      .slice(0, 5);
    
    console.log('\n🏆 ТОП-5 ОБЪЕКТОВ ПО ТЕХКАРТАМ:');
    topObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.database} - ${obj.techCards} техкарт`);
    });

    console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА!');

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkObjectsCompliance();
