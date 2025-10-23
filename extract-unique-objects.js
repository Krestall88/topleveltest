const fs = require('fs');
const path = require('path');

function extractUniqueObjects() {
  try {
    console.log('🔍 Извлекаем уникальные объекты из context_1.md...\n');

    // Читаем файл
    const contextPath = path.join(__dirname, 'context_1.md');
    const content = fs.readFileSync(contextPath, 'utf-8');
    const lines = content.split('\n');

    const uniqueObjects = new Set();
    const objectsWithAddresses = new Map();

    for (let i = 1; i < lines.length; i++) { // Пропускаем заголовок
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t');
      if (columns.length < 2) continue;

      const objectName = columns[0];
      const address = columns[1];

      if (!objectName || objectName === 'наименование объекта') continue;

      uniqueObjects.add(objectName);
      if (address && address.trim()) {
        objectsWithAddresses.set(objectName, address);
      }
    }

    console.log(`📊 Найдено уникальных объектов: ${uniqueObjects.size}\n`);

    // Выводим список всех объектов
    let counter = 1;
    for (const objectName of Array.from(uniqueObjects).sort()) {
      const address = objectsWithAddresses.get(objectName) || 'Адрес не указан';
      console.log(`${counter.toString().padStart(2, '0')}. ${objectName}`);
      console.log(`    Адрес: ${address}\n`);
      counter++;
    }

    console.log('='.repeat(80));
    console.log(`🎯 ИТОГО: ${uniqueObjects.size} уникальных объектов для создания`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

extractUniqueObjects();
