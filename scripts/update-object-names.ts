import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ObjectNameMapping {
  objectId: string;
  oldName: string;
  newName: string;
}

/**
 * Скрипт для массового обновления названий объектов
 * 
 * Использование:
 * 1. Создайте файл object-names.json в папке scripts со структурой:
 * [
 *   {
 *     "objectId": "clxxx...",
 *     "oldName": "Старое название",
 *     "newName": "Новое название"
 *   }
 * ]
 * 
 * 2. Запустите: npm run update-object-names
 */

async function updateObjectNames() {
  try {
    console.log('🔄 Начинаем обновление названий объектов...\n');

    // Читаем файл с маппингом
    const mappingPath = path.join(__dirname, 'object-names.json');
    
    if (!fs.existsSync(mappingPath)) {
      console.error('❌ Файл object-names.json не найден!');
      console.log('📝 Создайте файл scripts/object-names.json со структурой:');
      console.log('[');
      console.log('  {');
      console.log('    "objectId": "clxxx...",');
      console.log('    "oldName": "Старое название",');
      console.log('    "newName": "Новое название"');
      console.log('  }');
      console.log(']');
      return;
    }

    const mappings: ObjectNameMapping[] = JSON.parse(
      fs.readFileSync(mappingPath, 'utf-8')
    );

    console.log(`📊 Найдено ${mappings.length} объектов для обновления\n`);

    // Статистика
    let updatedObjects = 0;
    let updatedTasks = 0;
    const errors: string[] = [];

    // Обновляем каждый объект
    for (const mapping of mappings) {
      try {
        console.log(`\n🔍 Обрабатываем объект: ${mapping.oldName}`);
        console.log(`   ID: ${mapping.objectId}`);
        console.log(`   Новое название: ${mapping.newName}`);

        // Проверяем существование объекта
        const object = await prisma.cleaningObject.findUnique({
          where: { id: mapping.objectId },
          select: { 
            name: true,
            _count: {
              select: {
                techCards: true,
                rooms: true,
                checklists: true
              }
            }
          }
        });

        if (!object) {
          console.log(`   ⚠️ Объект не найден в БД`);
          errors.push(`Объект ${mapping.objectId} не найден`);
          continue;
        }

        console.log(`   📋 Связанные данные:`);
        console.log(`      - Техкарт: ${object._count.techCards}`);
        console.log(`      - Помещений: ${object._count.rooms}`);
        console.log(`      - Чеклистов: ${object._count.checklists}`);

        // Обновляем название объекта
        await prisma.cleaningObject.update({
          where: { id: mapping.objectId },
          data: { name: mapping.newName }
        });
        updatedObjects++;
        console.log(`   ✅ Название объекта обновлено`);

        // Обновляем objectName в задачах
        const taskUpdateResult = await prisma.task.updateMany({
          where: { objectName: mapping.oldName },
          data: { objectName: mapping.newName }
        });
        updatedTasks += taskUpdateResult.count;
        
        if (taskUpdateResult.count > 0) {
          console.log(`   ✅ Обновлено задач: ${taskUpdateResult.count}`);
        }

      } catch (error) {
        console.error(`   ❌ Ошибка при обновлении объекта ${mapping.objectId}:`, error);
        errors.push(`Ошибка для ${mapping.objectId}: ${error}`);
      }
    }

    // Итоговая статистика
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено объектов: ${updatedObjects}/${mappings.length}`);
    console.log(`✅ Обновлено задач: ${updatedTasks}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️ Ошибки (${errors.length}):`);
      errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✅ Обновление завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Функция для экспорта текущих названий объектов
async function exportCurrentNames() {
  try {
    console.log('📤 Экспортируем текущие названия объектов...\n');

    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        manager: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            techCards: true,
            rooms: true,
            checklists: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const exportData = objects.map(obj => ({
      objectId: obj.id,
      oldName: obj.name,
      newName: obj.name, // Заполните вручную
      managerName: obj.manager?.name || 'Не назначен',
      techCardsCount: obj._count.techCards,
      roomsCount: obj._count.rooms,
      checklistsCount: obj._count.checklists
    }));

    const exportPath = path.join(__dirname, 'current-object-names.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log(`✅ Экспортировано ${objects.length} объектов`);
    console.log(`📁 Файл сохранен: ${exportPath}`);
    console.log('\n📝 Отредактируйте поле "newName" и переименуйте файл в "object-names.json"');

  } catch (error) {
    console.error('❌ Ошибка экспорта:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Определяем режим работы
const mode = process.argv[2];

if (mode === 'export') {
  exportCurrentNames()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  updateObjectNames()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
