import * as fs from 'fs';
import * as path from 'path';

/**
 * Поиск файлов с проблемой params.id без await
 */

const apiDir = path.join(process.cwd(), 'src', 'app', 'api');

function findFilesWithParamsIssue(dir: string): string[] {
  const issues: string[] = [];
  
  function scanDirectory(currentDir: string) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file === 'route.ts') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Проверяем наличие params в сигнатуре функции
        const hasParamsInSignature = /\{\s*params\s*\}\s*:\s*\{\s*params:\s*\{/.test(content);
        
        if (hasParamsInSignature) {
          // Проверяем использование params.id или params.deputyId без await
          const lines = content.split('\n');
          let hasIssue = false;
          const issueLines: number[] = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Ищем прямое использование params.id или params.deputyId
            if (/params\.(id|deputyId)/.test(line)) {
              // Проверяем, что это не в сигнатуре функции и не после await
              const prevLines = lines.slice(Math.max(0, i - 3), i).join('\n');
              const isAfterAwait = /const\s*\{\s*(id|deputyId)\s*\}\s*=\s*await\s+params/.test(prevLines);
              const isInSignature = /\{\s*params\s*\}\s*:\s*\{\s*params:/.test(line);
              
              if (!isAfterAwait && !isInSignature) {
                hasIssue = true;
                issueLines.push(i + 1);
              }
            }
          }
          
          if (hasIssue) {
            const relativePath = path.relative(process.cwd(), fullPath);
            issues.push(`${relativePath} (строки: ${issueLines.join(', ')})`);
          }
        }
      }
    }
  }
  
  scanDirectory(dir);
  return issues;
}

console.log('🔍 ПОИСК ПРОБЛЕМ С params.id БЕЗ await\n');
console.log('='.repeat(70));

const issues = findFilesWithParamsIssue(apiDir);

if (issues.length === 0) {
  console.log('\n✅ Проблем не найдено! Все файлы используют await params.\n');
} else {
  console.log(`\n❌ Найдено файлов с проблемами: ${issues.length}\n`);
  
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('\n⚠️  ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ:');
  console.log('   Замените `params.id` на `await params` в начале функции:');
  console.log('   ');
  console.log('   БЫЛО:');
  console.log('   export async function DELETE(req, { params }) {');
  console.log('     await prisma.model.delete({ where: { id: params.id } });');
  console.log('   }');
  console.log('   ');
  console.log('   СТАЛО:');
  console.log('   export async function DELETE(req, { params }) {');
  console.log('     const { id } = await params;');
  console.log('     await prisma.model.delete({ where: { id } });');
  console.log('   }');
  console.log('');
}
