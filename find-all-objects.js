const fs = require('fs');

function findAllObjects() {
  try {
    console.log('🔍 ПОИСК ВСЕХ ОБЪЕКТОВ В CONTEXT_1.MD');
    console.log('=====================================\n');

    // Читаем файл
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');

    // Множество для уникальных объектов
    const uniqueObjects = new Set();
    
    // Проходим по всем строкам
    lines.forEach((line, index) => {
      if (line.trim() && !line.startsWith('наименование объекта')) {
        const parts = line.split('\t');
        const objectName = parts[0]?.trim();
        
        if (objectName && objectName.length > 3) {
          // Исключаем служебные строки
          if (!objectName.includes('покрова') && 
              !objectName.includes('месяц') && 
              !objectName.includes('по') &&
              !objectName.includes('вывоза') &&
              !objectName.includes('допускается') &&
              !objectName.includes('1 чел') &&
              !objectName.includes('2 чел') &&
              !objectName.includes('График') &&
              !objectName.includes('Уборка в выходные') &&
              !objectName.includes('Полив в утреннее') &&
              !objectName.includes('Покос на высоту') &&
              !objectName.includes('с последующим') &&
              !objectName.includes('раза') &&
              !objectName.includes('с 01.05') &&
              !objectName.includes('По всем услугам') &&
              !objectName.includes('отсутствие:') &&
              !objectName.includes('Вывоз снега') &&
              !objectName.includes('недопустимо') &&
              !objectName.includes('увлажнение') &&
              !objectName.includes('категорически') &&
              !objectName.includes('Подметание лестниц') &&
              !objectName.includes('Пешеходная дорожка') &&
              !objectName.includes('Газон Уборка') &&
              !objectName.includes('отмостком') &&
              !objectName.includes('дорожкой') &&
              !objectName.includes('высохшей') &&
              !objectName.includes('насаждениями') &&
              !objectName.includes('дневные часы') &&
              !objectName.includes('запрещен') &&
              !objectName.includes('мин') &&
              !objectName.includes('глубину') &&
              !objectName.includes('время с') &&
              !objectName.includes('зоны не менее') &&
              !objectName.includes('мест с') &&
              !objectName.includes('зелеными') &&
              !objectName.includes('В дневные') &&
              !objectName.includes('18.00 полив') &&
              !objectName.includes('9.00 до') &&
              !objectName.includes('5.00 до') &&
              !objectName.includes('вечернее время') &&
              !objectName.includes('утреннее время') &&
              !objectName.includes('почвы на') &&
              !objectName.includes('см. полив') &&
              !objectName.includes('5-7 см') &&
              !objectName.includes('травой') &&
              !objectName.includes('высохшими') &&
              objectName !== 'в теплый период' &&
              objectName !== 'в холодный период' &&
              objectName !== 'в теплый период:' &&
              objectName !== 'в холодный период:' &&
              objectName !== '' &&
              objectName !== ' ' &&
              objectName !== '  ' &&
              objectName !== '   '
          ) {
            uniqueObjects.add(objectName);
          }
        }
      }
    });

    // Преобразуем в массив и сортируем
    const objectsList = Array.from(uniqueObjects).sort();

    console.log(`📋 НАЙДЕНО УНИКАЛЬНЫХ ОБЪЕКТОВ: ${objectsList.length}\n`);
    
    // Группируем по типам
    const groups = {
      'ООО': [],
      'АО/ОАО/ЗАО': [],
      'ОБЩЕСТВО': [],
      'Другие': []
    };

    objectsList.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj}`);
      
      if (obj.includes('ООО')) {
        groups['ООО'].push(obj);
      } else if (obj.includes('АО') || obj.includes('ОАО') || obj.includes('ЗАО')) {
        groups['АО/ОАО/ЗАО'].push(obj);
      } else if (obj.includes('ОБЩЕСТВО')) {
        groups['ОБЩЕСТВО'].push(obj);
      } else {
        groups['Другие'].push(obj);
      }
    });

    console.log('\n📊 ГРУППИРОВКА ПО ТИПАМ:');
    console.log('========================');
    Object.keys(groups).forEach(groupName => {
      if (groups[groupName].length > 0) {
        console.log(`\n${groupName} (${groups[groupName].length} объектов):`);
        groups[groupName].forEach((obj, index) => {
          console.log(`  ${index + 1}. ${obj}`);
        });
      }
    });

    // Проверяем, какие уже загружены
    const loadedObjects = [
      'Пепси 1 515 кв. м.',
      'ООО "БЦ «Сфера"',
      'ООО фирма «Нектар»',
      'Волгарь(ЖилЭнерго,ЖЭУ-66)',
      'ООО «УК «Амонд-ЖилКомСервис»',
      'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «Электрощит-Инжиниринг» 407,2м2.',
      'ООО ЧОО Гвардеец'
    ];

    console.log('\n✅ УЖЕ ЗАГРУЖЕНО (7 объектов):');
    console.log('==============================');
    loadedObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj}`);
    });

    // Находим незагруженные
    const notLoaded = objectsList.filter(obj => {
      return !loadedObjects.some(loaded => 
        obj.includes('Пепси') && loaded.includes('Пепси') ||
        obj.includes('БЦ') && obj.includes('Сфера') && loaded.includes('Сфера') ||
        obj.includes('Нектар') && loaded.includes('Нектар') ||
        obj.includes('Волгарь') && loaded.includes('Волгарь') ||
        obj.includes('Амонд') && loaded.includes('Амонд') ||
        obj.includes('Электрощит') && loaded.includes('Электрощит') ||
        obj.includes('Гвардеец') && loaded.includes('Гвардеец')
      );
    });

    console.log('\n🔄 ТРЕБУЮТ ЗАГРУЗКИ:');
    console.log('===================');
    notLoaded.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj}`);
    });

    console.log(`\n📈 ИТОГО:`);
    console.log(`Всего объектов: ${objectsList.length}`);
    console.log(`Уже загружено: ${loadedObjects.length}`);
    console.log(`Осталось загрузить: ${notLoaded.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

findAllObjects();
