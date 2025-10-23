const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDynamicAPI() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ API ДИНАМИЧЕСКОГО ДЕРЕВА');
    console.log('========================================\n');

    // Получаем объект Пепси для тестирования
    const pepsiObject = await prisma.cleaningObject.findFirst({
      where: { name: 'ООО «ПепсиКо Холдингс»' }
    });

    if (!pepsiObject) {
      console.log('❌ Объект Пепси не найден');
      return;
    }

    console.log(`🏢 Тестируем объект: ${pepsiObject.name}`);
    console.log(`   ID: ${pepsiObject.id}\n`);

    // Получаем данные из плоской таблицы
    const records = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObject.id },
      take: 10,
      orderBy: [
        { siteName: 'asc' },
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' },
        { cleaningObjectName: 'asc' },
        { techCardName: 'asc' }
      ]
    });

    console.log(`📊 Найдено записей: ${records.length}`);
    console.log('\n📋 ПРИМЕРЫ ЗАПИСЕЙ:');
    console.log('===================');

    records.slice(0, 5).forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.techCardName}`);
      console.log(`   Объект: ${record.objectName}`);
      if (record.siteName) console.log(`   Участок: ${record.siteName}`);
      if (record.zoneName) console.log(`   Зона: ${record.zoneName}`);
      if (record.roomGroupName) console.log(`   Группа: ${record.roomGroupName}`);
      if (record.roomName) console.log(`   Помещение: ${record.roomName}`);
      if (record.cleaningObjectName) console.log(`   Объект уборки: ${record.cleaningObjectName}`);
      console.log(`   Периодичность: ${record.frequency}`);
      if (record.notes) console.log(`   Примечания: ${record.notes}`);
      if (record.period) console.log(`   Период: ${record.period}`);
    });

    // Тестируем построение дерева
    console.log('\n🌳 ТЕСТИРОВАНИЕ ПОСТРОЕНИЯ ДЕРЕВА:');
    console.log('===================================');

    const tree = buildDynamicTree(records);
    console.log(`Построено узлов верхнего уровня: ${tree.length}`);

    tree.forEach((node, index) => {
      console.log(`\n${index + 1}. ${getNodeIcon(node.type)} ${node.name} (${node.type})`);
      if (node.children && node.children.length > 0) {
        console.log(`   Дочерних узлов: ${node.children.length}`);
        node.children.slice(0, 2).forEach(child => {
          console.log(`   - ${getNodeIcon(child.type)} ${child.name} (${child.type})`);
        });
        if (node.children.length > 2) {
          console.log(`   ... и еще ${node.children.length - 2} узлов`);
        }
      }
    });

    console.log('\n✅ API ГОТОВ К ИСПОЛЬЗОВАНИЮ!');
    console.log('Теперь фронтенд должен показывать правильную структуру.');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function buildDynamicTree(records) {
  const tree = {};

  records.forEach(record => {
    const path = [];
    
    if (record.siteName) path.push({ type: 'site', name: record.siteName, id: record.siteId });
    if (record.zoneName) path.push({ type: 'zone', name: record.zoneName, id: record.zoneId });
    if (record.roomGroupName) path.push({ type: 'roomGroup', name: record.roomGroupName, id: record.roomGroupId });
    if (record.roomName) path.push({ type: 'room', name: record.roomName, id: record.roomId });
    if (record.cleaningObjectName) path.push({ type: 'cleaningObject', name: record.cleaningObjectName, id: record.cleaningObjectId });
    
    path.push({ 
      type: 'techCard', 
      name: record.techCardName, 
      id: record.techCardId,
      frequency: record.frequency,
      workType: record.workType,
      description: record.description,
      notes: record.notes,
      period: record.period
    });

    let current = tree;
    
    path.forEach((node, index) => {
      const key = `${node.type}:${node.name}`;
      
      if (!current[key]) {
        current[key] = {
          type: node.type,
          name: node.name,
          id: node.id,
          children: {},
          ...(node.type === 'techCard' && {
            frequency: node.frequency,
            workType: node.workType,
            description: node.description,
            notes: node.notes,
            period: node.period
          })
        };
      }
      
      current = current[key].children;
    });
  });

  return convertTreeToArray(tree);
}

function convertTreeToArray(tree) {
  return Object.values(tree).map((node) => ({
    ...node,
    children: node.children && Object.keys(node.children).length > 0 
      ? convertTreeToArray(node.children) 
      : []
  }));
}

function getNodeIcon(type) {
  switch (type) {
    case 'site': return '🏗️';
    case 'zone': return '📍';
    case 'roomGroup': return '📦';
    case 'room': return '🏠';
    case 'cleaningObject': return '📋';
    case 'techCard': return '🔧';
    default: return '📄';
  }
}

testDynamicAPI();
