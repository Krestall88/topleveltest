const fs = require('fs');
const path = require('path');

function findAllRealObjects() {
  try {
    console.log('🔍 ПОИСК ВСЕХ РЕАЛЬНЫХ ОБЪЕКТОВ В CONTEXT_1.MD');
    console.log('='.repeat(80));

    // Читаем файл
    const contextPath = path.join(__dirname, 'context_1.md');
    const content = fs.readFileSync(contextPath, 'utf-8');
    const lines = content.split('\n');

    const realObjects = new Map();

    // Список известных реальных объектов по ключевым словам
    const objectPatterns = [
      /ООО.*?(?=\t|$)/,
      /АО.*?(?=\t|$)/,
      /ЗАО.*?(?=\t|$)/,
      /ПАО.*?(?=\t|$)/,
      /Общество.*?(?=\t|$)/,
      /Индивидуальный предприниматель.*?(?=\t|$)/,
      /МБУ.*?(?=\t|$)/,
      /ФГБОУ.*?(?=\t|$)/,
      /УФПСО.*?(?=\t|$)/,
      /УК.*?(?=\t|$)/,
      /Волгарь.*?(?=\t|$)/,
      /Пепси.*?(?=\t|$)/,
      /Самараэнерго.*?(?=\t|$)/,
      /КОМПАКТИВ.*?(?=\t|$)/,
      /Медицина.*?(?=\t|$)/,
      /филиала.*?(?=\t|$)/,
      /Акционерное общество.*?(?=\t|$)/
    ];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t');
      if (columns.length < 2) continue;

      const objectName = columns[0];
      const address = columns[1];

      if (!objectName || objectName === 'наименование объекта') continue;

      // Проверяем, соответствует ли название одному из паттернов
      let isRealObject = false;
      for (const pattern of objectPatterns) {
        if (pattern.test(objectName)) {
          isRealObject = true;
          break;
        }
      }

      // Дополнительные проверки для исключения мусорных данных
      if (objectName.length < 5 ||
          objectName.match(/^\d+\.$/) ||
          objectName.match(/^-/) ||
          objectName.includes('раза в месяц') ||
          objectName.includes('выходной') ||
          objectName.includes('Уборка') && !objectName.includes('ООО') ||
          objectName.includes('мытье') ||
          objectName.includes('допускается') ||
          objectName.includes('покрова') ||
          objectName.includes('вывоза мусора') ||
          objectName.includes('май - октябрь') ||
          objectName.includes('по 30.10.2025г') ||
          objectName.includes('31.10.2025г')) {
        isRealObject = false;
      }

      if (isRealObject) {
        realObjects.set(objectName, {
          name: objectName,
          address: address && address.trim() && address !== ' ' ? address : 'Адрес не указан',
          firstLine: i + 1
        });
      }
    }

    console.log(`📊 Найдено реальных объектов: ${realObjects.size}\n`);

    // Выводим список всех найденных объектов
    let counter = 1;
    for (const [objectName, data] of Array.from(realObjects.entries()).sort()) {
      console.log(`${counter.toString().padStart(2, '0')}. ${objectName}`);
      console.log(`    📍 Адрес: ${data.address}`);
      console.log(`    📄 Строка в файле: ${data.firstLine}\n`);
      counter++;
    }

    console.log('='.repeat(80));
    console.log(`🎯 ИТОГО: ${realObjects.size} реальных объектов найдено`);

    // Сохраняем список в файл для дальнейшего использования
    const objectsList = Array.from(realObjects.values());
    fs.writeFileSync(
      path.join(__dirname, 'real-objects-list.json'), 
      JSON.stringify(objectsList, null, 2), 
      'utf-8'
    );
    console.log('💾 Список сохранен в real-objects-list.json');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

findAllRealObjects();
