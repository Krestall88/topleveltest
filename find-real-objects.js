const fs = require('fs');

function findRealObjects() {
  try {
    console.log('🔍 ПОИСК РЕАЛЬНЫХ ОБЪЕКТОВ В CONTEXT_1.MD');
    console.log('=========================================\n');

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
        
        if (objectName && objectName.length > 5) {
          // Фильтруем только реальные названия объектов
          if (
            // Должно содержать организационно-правовую форму или быть известным объектом
            (objectName.includes('ООО') || 
             objectName.includes('АО') || 
             objectName.includes('ОАО') || 
             objectName.includes('ЗАО') || 
             objectName.includes('ПАО') ||
             objectName.includes('ОБЩЕСТВО') ||
             objectName.includes('Акционерное') ||
             objectName.includes('Товарищество') ||
             objectName.includes('Индивидуальный предприниматель') ||
             objectName.includes('МБУ') ||
             objectName.includes('ФГБОУ') ||
             objectName.includes('УФПСО') ||
             objectName.includes('УК ') ||
             objectName.includes('Пепси') ||
             objectName.includes('Волгарь') ||
             objectName.includes('Медицина') ||
             objectName.includes('Самараэнерго') ||
             objectName.includes('КОМПАКТИВ') ||
             objectName.includes('филиала')) &&
            
            // НЕ должно содержать служебную информацию
            !objectName.includes('протирка') &&
            !objectName.includes('раз в день') &&
            !objectName.includes('31.10.2025') &&
            !objectName.includes('АТЦ –') &&
            !objectName.includes('Вечерняя уборка') &&
            !objectName.includes('Воскресенье:') &&
            !objectName.includes('Понедельник') &&
            !objectName.includes('Суббота:') &&
            !objectName.includes('По требованию') &&
            !objectName.includes('СОП, ПМК') &&
            !objectName.includes('ПРУ (ЭМЦ)') &&
            !objectName.includes('ПТПиА') &&
            !objectName.includes('МетОП') &&
            !objectName.includes('ЦГП гальванника') &&
            !objectName.includes('архив,') &&
            !objectName.includes('венткамера') &&
            !objectName.includes('май - октябрь') &&
            !objectName.includes('мытье и дезинфекция') &&
            !objectName.includes('серверная') &&
            !objectName.includes('складские') &&
            !objectName.includes('электрощитовая') &&
            !objectName.includes('Уборка снега с лестниц') &&
            !objectName.includes('с 7:15 до') &&
            !objectName.includes('с 8:15 до') &&
            !objectName.includes('– 8:00 –') &&
            !objectName.includes('час ПМЗ') &&
            !objectName.includes('17.00-') &&
            !objectName.includes('6:30 –') &&
            !objectName.includes('7:00 -') &&
            !objectName.includes('5:30 –') &&
            objectName !== 'в теплый период' &&
            objectName !== 'в холодный период' &&
            objectName !== 'в теплый период:' &&
            objectName !== 'в холодный период:' &&
            objectName !== '' &&
            objectName !== ' '
          ) {
            uniqueObjects.add(objectName);
          }
        }
      }
    });

    // Преобразуем в массив и сортируем
    const objectsList = Array.from(uniqueObjects).sort();

    console.log(`📋 НАЙДЕНО РЕАЛЬНЫХ ОБЪЕКТОВ: ${objectsList.length}\n`);
    
    // Выводим список
    objectsList.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj}`);
    });

    // Группируем по типам
    const groups = {
      'ООО': [],
      'АО/ОАО/ЗАО/ПАО': [],
      'ОБЩЕСТВО': [],
      'Государственные/Муниципальные': [],
      'Другие': []
    };

    objectsList.forEach(obj => {
      if (obj.includes('ООО')) {
        groups['ООО'].push(obj);
      } else if (obj.includes('АО') || obj.includes('ОАО') || obj.includes('ЗАО') || obj.includes('ПАО') || obj.includes('Акционерное')) {
        groups['АО/ОАО/ЗАО/ПАО'].push(obj);
      } else if (obj.includes('ОБЩЕСТВО')) {
        groups['ОБЩЕСТВО'].push(obj);
      } else if (obj.includes('МБУ') || obj.includes('ФГБОУ') || obj.includes('УФПСО')) {
        groups['Государственные/Муниципальные'].push(obj);
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
        obj.includes('Электрощит-Инжиниринг') && loaded.includes('Электрощит') ||
        obj.includes('Гвардеец') && loaded.includes('Гвардеец')
      );
    });

    console.log('\n🔄 ТРЕБУЮТ ЗАГРУЗКИ:');
    console.log('===================');
    notLoaded.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj}`);
    });

    console.log(`\n📈 ИТОГО:`);
    console.log(`Всего реальных объектов: ${objectsList.length}`);
    console.log(`Уже загружено: ${loadedObjects.length}`);
    console.log(`Осталось загрузить: ${notLoaded.length}`);

    // Показываем приоритетные для загрузки (крупные объекты)
    console.log('\n🎯 ПРИОРИТЕТНЫЕ ДЛЯ ЗАГРУЗКИ (крупные объекты):');
    console.log('===============================================');
    const priorityObjects = notLoaded.filter(obj => 
      obj.includes('м2') || 
      obj.includes('кв. м') ||
      obj.includes('ТЯЖМАШ') ||
      obj.includes('ЭЛЕКТРОЩИТ') ||
      obj.includes('хлебозавод') ||
      obj.includes('Медицина') ||
      obj.includes('Самараэнерго') ||
      obj.includes('ИНКАТЕХ') ||
      obj.includes('Маркет.Операции')
    );
    
    priorityObjects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

findRealObjects();
