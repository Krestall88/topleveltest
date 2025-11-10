import * as fs from 'fs';
import * as path from 'path';

/**
 * Автоматическое исправление params.id без await
 */

const filesToFix = [
  'src/app/api/sites/[id]/route.ts',
  'src/app/api/rooms/[id]/route.ts',
  'src/app/api/managers/[id]/route.ts',
  'src/app/api/users/[id]/route.ts',
];

function fixFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Файл не найден: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  
  // Паттерн для поиска функций с params
  const functionPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\{\s*params\s*\}[^)]*\)\s*\{/g;
  
  let match;
  const functions: Array<{ type: string; start: number; end: number }> = [];
  
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push({
      type: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // Для каждой функции проверяем, есть ли await params
  for (const func of functions.reverse()) { // reverse чтобы индексы не сбивались
    const funcStart = func.end;
    const nextFuncStart = functions.find(f => f.start > func.start)?.start || content.length;
    const funcBody = content.substring(funcStart, nextFuncStart);
    
    // Проверяем, есть ли уже await params
    const hasAwaitParams = /const\s*\{\s*(?:id|deputyId)\s*\}\s*=\s*await\s+params/.test(funcBody);
    
    if (!hasAwaitParams) {
      // Проверяем, используется ли params.id или params.deputyId
      const usesParamsId = /params\.(id|deputyId)/.test(funcBody);
      
      if (usesParamsId) {
        // Находим первую строку после try {
        const tryMatch = funcBody.match(/try\s*\{/);
        if (tryMatch) {
          const insertPos = funcStart + tryMatch.index! + tryMatch[0].length;
          
          // Определяем, какой параметр используется
          const paramName = funcBody.includes('params.deputyId') ? 'deputyId' : 'id';
          
          // Вставляем await params
          const insertion = `\n    const { ${paramName} } = await params;\n`;
          content = content.substring(0, insertPos) + insertion + content.substring(insertPos);
          
          // Заменяем все params.id на просто id
          const funcEndPos = insertPos + insertion.length + (nextFuncStart - funcStart);
          let updatedFuncBody = content.substring(insertPos + insertion.length, funcEndPos);
          updatedFuncBody = updatedFuncBody.replace(new RegExp(`params\\.${paramName}`, 'g'), paramName);
          
          content = content.substring(0, insertPos + insertion.length) + updatedFuncBody + content.substring(funcEndPos);
          
          console.log(`   ✅ Исправлена функция ${func.type}`);
        }
      }
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    return true;
  }
  
  return false;
}

console.log('🔧 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ params.id\n');
console.log('='.repeat(70));

let fixedCount = 0;
let skippedCount = 0;

for (const file of filesToFix) {
  console.log(`\n📝 Обрабатываем: ${file}`);
  
  if (fixFile(file)) {
    console.log(`   ✅ Файл исправлен`);
    fixedCount++;
  } else {
    console.log(`   ⏭️  Пропущен (уже исправлен или нет проблем)`);
    skippedCount++;
  }
}

console.log('\n' + '='.repeat(70));
console.log(`\n📊 РЕЗУЛЬТАТ:`);
console.log(`   ✅ Исправлено файлов: ${fixedCount}`);
console.log(`   ⏭️  Пропущено файлов: ${skippedCount}`);
console.log(`\n🔍 Запустите проверку:`);
console.log(`   npx tsx scripts/find-params-issues.ts`);
