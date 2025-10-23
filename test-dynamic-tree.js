const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDynamicTree() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ДИНАМИЧЕСКОГО ДЕРЕВА');
    console.log('===================================\n');

    // Получаем несколько объектов с разной структурой
    const testObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          in: [
            'ООО «ПепсиКо Холдингс»', // Полная 7-уровневая структура
            'Медицина АльфаСтрахования МедАС', // 5-уровневая структура
            'ООО «НЛ Континент»' // Простая структура
          ]
        }
      },
      take: 3
    });

    console.log(`📊 Найдено тестовых объектов: ${testObjects.length}\n`);

    for (const object of testObjects) {
      console.log(`🏢 ТЕСТИРУЕМ: ${object.name}`);
      console.log(`   ID: ${object.id}`);
      
      // Получаем структуру объекта
      const structure = await prisma.objectStructure.findMany({
        where: { objectId: object.id },
        take: 10 // Первые 10 записей для примера
      });

      console.log(`   📋 Записей в структуре: ${structure.length}`);
      
      // Анализируем уровни
      const levels = new Set();
      structure.forEach(record => {
        const path = [];
        if (record.siteName) path.push('Участок');
        if (record.zoneName) path.push('Зона');
        if (record.roomGroupName) path.push('Группа помещений');
        if (record.roomName) path.push('Помещение');
        if (record.cleaningObjectName) path.push('Объект уборки');
        path.push('Техкарта');
        levels.add(path.join(' → '));
      });

      console.log(`   🏗️ Структуры уровней:`);
      Array.from(levels).forEach(level => {
        console.log(`      ${level}`);
      });

      // Показываем примеры записей
      console.log(`   📝 Примеры записей:`);
      structure.slice(0, 3).forEach((record, index) => {
        console.log(`      ${index + 1}. ${record.techCardName} [${record.frequency}]`);
        if (record.siteName) console.log(`         Участок: ${record.siteName}`);
        if (record.zoneName) console.log(`         Зона: ${record.zoneName}`);
        if (record.roomGroupName) console.log(`         Группа: ${record.roomGroupName}`);
        if (record.roomName) console.log(`         Помещение: ${record.roomName}`);
        if (record.cleaningObjectName) console.log(`         Объект уборки: ${record.cleaningObjectName}`);
      });

      console.log('');
    }

    console.log('🎯 ИНСТРУКЦИИ ПО ИСПОЛЬЗОВАНИЮ:');
    console.log('===============================');
    console.log('1. Скопируйте ID любого объекта выше');
    console.log('2. Используйте компонент: <DynamicObjectTree objectId="ID" />');
    console.log('3. Компонент автоматически построит дерево только из заполненных уровней');
    console.log('4. API доступен по адресу: /api/object-structure?objectId=ID');
    console.log('');
    console.log('📱 ПРИМЕР ИНТЕГРАЦИИ В СТРАНИЦУ:');
    console.log('================================');
    console.log(`
import DynamicObjectTree from '@/components/DynamicObjectTree';

export default function ObjectPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Структура объекта</h1>
      <DynamicObjectTree objectId={params.id} />
    </div>
  );
}
    `);

    console.log('✅ Тестирование завершено!');
    console.log('Теперь у вас есть полноценное динамическое дерево структуры объектов.');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDynamicTree();
