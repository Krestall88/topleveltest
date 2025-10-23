const fs = require('fs');

// Читаем файл
const fileContent = fs.readFileSync('context_1.md', 'utf-8');
const lines = fileContent.split('\n');

// Извлекаем уникальные названия объектов из первого столбца
const objectNames = new Set();

lines.forEach((line, index) => {
  if (index === 0) return; // пропускаем заголовок
  
  const parts = line.split('\t');
  const objectName = parts[0]?.trim();
  
  // Фильтруем только реальные названия организаций
  if (objectName && objectName !== '' && 
      (objectName.startsWith('ООО') || 
       objectName.startsWith('АО') || 
       objectName.startsWith('ЗАО') || 
       objectName.startsWith('ОАО') || 
       objectName.startsWith('ПАО') || 
       objectName.startsWith('ФГБОУ') || 
       objectName.startsWith('МБУ') || 
       objectName.startsWith('УФПСО') || 
       objectName.startsWith('Медицина') || 
       objectName.startsWith('Пепси') || 
       objectName.startsWith('Самараэнерго') || 
       objectName.startsWith('Волгарь') || 
       objectName.startsWith('Индивидуальный') || 
       objectName.startsWith('Акционерное') ||
       objectName.startsWith('Общество') ||
       objectName.startsWith('Товарищество') ||
       objectName.startsWith('УК ') ||
       objectName.startsWith('КОМПАКТИВ') ||
       objectName.includes('филиала АО'))) {
    objectNames.add(objectName);
  }
});

// Сортируем и выводим
const sortedNames = Array.from(objectNames).sort();

console.log('📋 РЕАЛЬНЫЕ ОБЪЕКТЫ ИЗ ФАЙЛА context_1.md:');
console.log('==========================================');
sortedNames.forEach((name, index) => {
  console.log(`${index + 1}. ${name}`);
});

console.log(`\n📊 Всего реальных объектов: ${sortedNames.length}`);
