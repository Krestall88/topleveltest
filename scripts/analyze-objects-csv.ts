import * as fs from 'fs';
import * as path from 'path';

// Читаем CSV файл
const csvPath = path.join(__dirname, '..', 'data', 'objects.csv');
const content = fs.readFileSync(csvPath, 'utf-8');

// Разбиваем на строки
const lines = content.split('\n').filter(line => line.trim());

console.log('📊 АНАЛИЗ ФАЙЛА objects.csv\n');
console.log(`Всего строк: ${lines.length}`);
console.log(`Первая строка (заголовки):\n${lines[0]}\n`);

// Парсим заголовки
const headers = lines[0].split('\t');
console.log('📋 Колонки:');
headers.forEach((header, index) => {
  console.log(`  ${index + 1}. ${header}`);
});

console.log('\n📝 Первые 5 строк данных:\n');
for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
  const row = lines[i].split('\t');
  console.log(`\nСтрока ${i}:`);
  headers.forEach((header, index) => {
    if (row[index]) {
      console.log(`  ${header}: ${row[index]}`);
    }
  });
}

// Статистика
console.log('\n📈 СТАТИСТИКА:\n');

const objects = new Set();
const sites = new Set();
const zones = new Set();
const roomGroups = new Set();
const rooms = new Set();
const managers = new Set();
const seniorManagers = new Set();

for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split('\t');
  if (row[0]) objects.add(row[0]); // наименование объекта
  if (row[2]) sites.add(row[2]); // участок
  if (row[3]) zones.add(row[3]); // зона
  if (row[4]) roomGroups.add(row[4]); // группа помещений
  if (row[5]) rooms.add(row[5]); // помещение
  if (row[11]) managers.add(row[11]); // Менеджер объекта ФИО
  if (row[13]) seniorManagers.add(row[13]); // Старший менеджер объекта ФИО
}

console.log(`Уникальных объектов: ${objects.size}`);
console.log(`Уникальных участков: ${sites.size}`);
console.log(`Уникальных зон: ${zones.size}`);
console.log(`Уникальных групп помещений: ${roomGroups.size}`);
console.log(`Уникальных помещений: ${rooms.size}`);
console.log(`Уникальных менеджеров: ${managers.size}`);
console.log(`Уникальных старших менеджеров: ${seniorManagers.size}`);

console.log('\n👥 МЕНЕДЖЕРЫ:');
Array.from(managers).sort().forEach(m => console.log(`  - ${m}`));

console.log('\n👔 СТАРШИЕ МЕНЕДЖЕРЫ:');
Array.from(seniorManagers).sort().forEach(m => console.log(`  - ${m}`));

console.log('\n🏢 ОБЪЕКТЫ:');
Array.from(objects).sort().forEach(o => console.log(`  - ${o}`));
