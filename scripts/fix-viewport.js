/**
 * Скрипт для автоматического исправления viewport в страницах Next.js
 * 
 * Удаляет viewport из metadata во всех страницах,
 * так как он уже определен в главном layout.tsx
 */

const fs = require('fs');
const path = require('path');

// Папка с приложением
const appDir = path.join(__dirname, '..', 'src', 'app');

// Рекурсивный поиск всех page.tsx файлов
function findPageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findPageFiles(filePath, fileList);
    } else if (file === 'page.tsx' || file === 'layout.tsx') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Удаление viewport из файла
function removeViewportFromFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Проверяем, есть ли viewport в metadata
  if (content.includes('viewport:')) {
    console.log(`📝 Обрабатываю: ${filePath}`);
    
    // Удаляем viewport из metadata
    // Паттерн для поиска viewport внутри metadata
    const viewportPattern = /,?\s*viewport:\s*\{[^}]*\},?/gs;
    
    if (viewportPattern.test(content)) {
      content = content.replace(viewportPattern, '');
      modified = true;
      console.log(`  ✅ Удален viewport`);
    }
    
    // Удаляем лишние запятые
    content = content.replace(/,(\s*)\}/g, '$1}');
    content = content.replace(/\{\s*,/g, '{');
    
    // Сохраняем файл
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  💾 Файл сохранен\n`);
      return true;
    }
  }
  
  return false;
}

// Основная функция
function main() {
  console.log('🚀 Начинаю исправление viewport в страницах...\n');
  
  const pageFiles = findPageFiles(appDir);
  console.log(`📂 Найдено файлов: ${pageFiles.length}\n`);
  
  let modifiedCount = 0;
  
  pageFiles.forEach(filePath => {
    // Пропускаем главный layout.tsx
    if (filePath.endsWith('app\\layout.tsx') || filePath.endsWith('app/layout.tsx')) {
      console.log(`⏭️  Пропускаю главный layout: ${filePath}\n`);
      return;
    }
    
    if (removeViewportFromFile(filePath)) {
      modifiedCount++;
    }
  });
  
  console.log('\n✅ Готово!');
  console.log(`📊 Изменено файлов: ${modifiedCount}`);
  console.log(`📊 Всего проверено: ${pageFiles.length}`);
}

// Запуск
try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error);
  process.exit(1);
}
