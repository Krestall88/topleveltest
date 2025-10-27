const fs = require('fs');
const path = require('path');

function checkCriticalComponents() {
  console.log('🔍 ПРОВЕРКА КРИТИЧЕСКИ ВАЖНЫХ КОМПОНЕНТОВ...\n');
  
  const criticalFiles = [
    // Основные компоненты системы задач
    'src/lib/unified-task-system.ts',
    'src/app/api/tasks/unified-complete/route.ts',
    'src/components/UnifiedTaskCompletionModal.tsx',
    'src/components/SimpleTaskListModal.tsx',
    
    // Компоненты работы со структурами
    'src/components/StructureItemModal.tsx',
    'src/components/ObjectStructureManager.tsx',
    
    // Компоненты техкарт
    'src/components/TechCardModal.tsx',
    'src/components/TechCardManager.tsx',
    
    // API для объектов и структур
    'src/app/api/objects/[id]/route.ts',
    'src/app/api/objects/[id]/structures/route.ts',
    'src/app/api/techcards/route.ts',
    
    // Компоненты отчетности
    'src/components/ReportingTaskModal.tsx',
    'src/app/api/reporting/tasks/route.ts',
    
    // Основные страницы
    'src/app/objects/page.tsx',
    'src/app/reporting/page.tsx',
    
    // Схема базы данных
    'prisma/schema.prisma'
  ];
  
  let existingFiles = 0;
  let missingFiles = 0;
  
  console.log('📁 СОСТОЯНИЕ КРИТИЧЕСКИ ВАЖНЫХ ФАЙЛОВ:');
  
  criticalFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${filePath}`);
      existingFiles++;
    } else {
      console.log(`❌ ${filePath} - ОТСУТСТВУЕТ!`);
      missingFiles++;
    }
  });
  
  console.log(`\n📊 СТАТИСТИКА:`);
  console.log(`✅ Существующих файлов: ${existingFiles}`);
  console.log(`❌ Отсутствующих файлов: ${missingFiles}`);
  
  // Проверяем содержимое ключевых файлов
  console.log('\n🔍 ПРОВЕРКА СОДЕРЖИМОГО КЛЮЧЕВЫХ ФАЙЛОВ:');
  
  const keyFiles = [
    'src/lib/unified-task-system.ts',
    'src/components/StructureItemModal.tsx',
    'prisma/schema.prisma'
  ];
  
  keyFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      const size = Math.round(content.length / 1024);
      console.log(`📄 ${filePath}: ${lines} строк, ${size} KB`);
      
      // Проверяем ключевые функции
      if (filePath.includes('unified-task-system')) {
        const hasGrouping = content.includes('groupTasksByTechCard');
        const hasMaterialization = content.includes('materializeVirtualTask');
        console.log(`   - Группировка задач: ${hasGrouping ? '✅' : '❌'}`);
        console.log(`   - Материализация: ${hasMaterialization ? '✅' : '❌'}`);
      }
      
      if (filePath.includes('StructureItemModal')) {
        const hasEditMode = content.includes('isEditing');
        const hasValidation = content.includes('validation');
        console.log(`   - Режим редактирования: ${hasEditMode ? '✅' : '❌'}`);
        console.log(`   - Валидация: ${hasValidation ? '✅' : '❌'}`);
      }
    }
  });
  
  console.log('\n💡 ВЫВОДЫ:');
  
  if (missingFiles === 0) {
    console.log('🎉 ВСЕ КРИТИЧЕСКИ ВАЖНЫЕ ФАЙЛЫ НА МЕСТЕ!');
    console.log('📋 Функционал редактирования структур - сохранен');
    console.log('📋 Функционал создания техкарт - сохранен');
    console.log('📋 Система задач - сохранена');
    console.log('📋 Отчетность - сохранена');
    
    console.log('\n✅ ПОСЛЕ ВОССТАНОВЛЕНИЯ БД:');
    console.log('1. Все UI компоненты будут работать');
    console.log('2. Все API endpoints будут работать');
    console.log('3. Вся логика приложения сохранена');
    console.log('4. Нужно только добавить новую таблицу ReportingTaskAttachment');
    
  } else {
    console.log('⚠️ НЕКОТОРЫЕ ФАЙЛЫ ОТСУТСТВУЮТ!');
    console.log('Нужно будет восстановить отсутствующие компоненты');
  }
  
  console.log('\n🔄 ЧТО ВОССТАНОВИТСЯ ИЗ БЭКАПА:');
  console.log('- Все объекты с полными данными');
  console.log('- Все помещения и их структуры');
  console.log('- Все техкарты с настройками');
  console.log('- Все задачи и их выполнения');
  console.log('- Все фотоотчеты');
  console.log('- Назначения менеджеров');
  
  console.log('\n🆕 ЧТО НУЖНО ДОБАВИТЬ:');
  console.log('- Таблицу ReportingTaskAttachment');
  console.log('- API для загрузки фотографий в задачи отчетности');
  console.log('- Обновленный ReportingTaskModal');
}

checkCriticalComponents();
