const fs = require('fs');

// Читаем файл
const content = fs.readFileSync('context_1.md', 'utf8');
const lines = content.split('\n');

// Пропускаем заголовок (первая строка)
const dataLines = lines.slice(1);

// Объект для подсчета
const objectCounts = {};

// Обрабатываем каждую строку
dataLines.forEach((line, index) => {
  if (line.trim()) {
    // Разделяем по табуляции и берем первый столбец
    const columns = line.split('\t');
    const objectName = columns[0]?.trim();
    
    if (objectName && objectName !== '') {
      // Увеличиваем счетчик для этого объекта
      objectCounts[objectName] = (objectCounts[objectName] || 0) + 1;
    }
  }
});

// Выводим результаты
console.log('=== АНАЛИЗ ОБЪЕКТОВ ИЗ ФАЙЛА context_1.md ===\n');
console.log(`Всего строк в файле: ${lines.length}`);
console.log(`Строк с данными (без заголовка): ${dataLines.length}`);
console.log(`Уникальных объектов найдено: ${Object.keys(objectCounts).length}\n`);

console.log('=== СПИСОК ОБЪЕКТОВ С КОЛИЧЕСТВОМ УПОМИНАНИЙ ===\n');

// Сортируем по количеству упоминаний (по убыванию)
const sortedObjects = Object.entries(objectCounts)
  .sort(([,a], [,b]) => b - a);

let totalMentions = 0;
sortedObjects.forEach(([objectName, count], index) => {
  console.log(`${index + 1}. "${objectName}" - ${count} упоминаний`);
  totalMentions += count;
});

console.log(`\n=== ИТОГОВАЯ СТАТИСТИКА ===`);
console.log(`Общее количество упоминаний объектов: ${totalMentions}`);
console.log(`Уникальных объектов: ${Object.keys(objectCounts).length}`);
console.log(`Среднее количество упоминаний на объект: ${(totalMentions / Object.keys(objectCounts).length).toFixed(2)}`);
