const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCorrectPepsi() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ ПРАВИЛЬНОГО ОБЪЕКТА ПЕПСИ');
    console.log('=========================================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4'; // ООО «ПепсиКо Холдингс»

    // Получаем объект
    const pepsiObject = await prisma.cleaningObject.findUnique({
      where: { id: pepsiObjectId }
    });

    if (!pepsiObject) {
      console.log('❌ Объект не найден');
      return;
    }

    console.log(`🏢 Объект: ${pepsiObject.name}`);
    console.log(`   ID: ${pepsiObject.id}\n`);

    // Получаем данные из плоской таблицы
    const records = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObjectId },
      orderBy: [
        { siteName: 'asc' },
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' },
        { cleaningObjectName: 'asc' },
        { techCardName: 'asc' }
      ]
    });

    console.log(`📊 Всего записей: ${records.length}\n`);

    // Анализируем структуру
    const zones = new Set();
    const roomGroups = new Set();
    const rooms = new Set();
    const cleaningObjects = new Set();

    records.forEach(record => {
      if (record.zoneName) zones.add(record.zoneName);
      if (record.roomGroupName) roomGroups.add(record.roomGroupName);
      if (record.roomName) rooms.add(record.roomName);
      if (record.cleaningObjectName) cleaningObjects.add(record.cleaningObjectName);
    });

    console.log('📈 СТАТИСТИКА СТРУКТУРЫ:');
    console.log('========================');
    console.log(`Участков: ${records.filter(r => r.siteName).length > 0 ? 1 : 0}`);
    console.log(`Зон: ${zones.size}`);
    console.log(`Групп помещений: ${roomGroups.size}`);
    console.log(`Помещений: ${rooms.size}`);
    console.log(`Объектов уборки: ${cleaningObjects.size}`);
    console.log(`Техкарт: ${records.length}`);

    // Показываем первые несколько зон
    console.log('\n📍 ПЕРВЫЕ 5 ЗОН:');
    console.log('================');
    Array.from(zones).slice(0, 5).forEach((zone, index) => {
      console.log(`${index + 1}. ${zone}`);
    });

    // Ищем зону со складом
    console.log('\n🔍 ПОИСК ЗОНЫ СО СКЛАДОМ:');
    console.log('=========================');
    const warehouseZones = Array.from(zones).filter(zone => 
      zone.toLowerCase().includes('склад')
    );

    if (warehouseZones.length > 0) {
      warehouseZones.forEach((zone, index) => {
        console.log(`${index + 1}. ${zone}`);
        
        // Показываем помещения в этой зоне
        const zoneRooms = records.filter(r => r.zoneName === zone);
        const uniqueRooms = new Set(zoneRooms.map(r => r.roomName).filter(Boolean));
        
        console.log(`   Помещений в зоне: ${uniqueRooms.size}`);
        Array.from(uniqueRooms).slice(0, 3).forEach(room => {
          console.log(`   - ${room}`);
        });
        if (uniqueRooms.size > 3) {
          console.log(`   ... и еще ${uniqueRooms.size - 3} помещений`);
        }
      });
    } else {
      console.log('❌ Зоны со складом не найдены');
    }

    // Тестируем построение дерева
    console.log('\n🌳 ТЕСТИРОВАНИЕ ПОСТРОЕНИЯ ДЕРЕВА:');
    console.log('===================================');

    const tree = buildDynamicTree(records.slice(0, 20)); // Первые 20 записей для теста
    console.log(`Построено узлов верхнего уровня: ${tree.length}`);

    tree.forEach((node, index) => {
      console.log(`\n${index + 1}. ${getNodeIcon(node.type)} ${node.name} (${node.type})`);
      if (node.children && node.children.length > 0) {
        console.log(`   Дочерних узлов: ${node.children.length}`);
        showTreeLevel(node.children, 1);
      }
    });

    console.log('\n✅ Тестирование завершено!');
    console.log('Теперь можно тестировать на странице /test-tree');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function showTreeLevel(nodes, level, maxLevel = 2) {
  if (level > maxLevel) return;
  
  nodes.slice(0, 2).forEach(node => {
    const indent = '  '.repeat(level + 1);
    console.log(`${indent}${getNodeIcon(node.type)} ${node.name} (${node.type})`);
    
    if (node.children && node.children.length > 0 && level < maxLevel) {
      showTreeLevel(node.children, level + 1, maxLevel);
    }
  });
  
  if (nodes.length > 2) {
    const indent = '  '.repeat(level + 1);
    console.log(`${indent}... и еще ${nodes.length - 2} узлов`);
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

testCorrectPepsi();
