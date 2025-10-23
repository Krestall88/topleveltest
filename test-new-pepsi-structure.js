const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewPepsiStructure() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ НОВОЙ СТРУКТУРЫ ПЕПСИ');
    console.log('====================================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

    // Получаем объект
    const pepsiObject = await prisma.cleaningObject.findUnique({
      where: { id: pepsiObjectId }
    });

    console.log(`🏢 Объект: ${pepsiObject.name}`);
    console.log(`📍 Адрес: ${pepsiObject.address}`);
    console.log(`   ID: ${pepsiObject.id}\n`);

    // Получаем все записи
    const records = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObjectId },
      orderBy: [
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' },
        { cleaningObjectName: 'asc' }
      ]
    });

    console.log(`📊 Всего техкарт: ${records.length}\n`);

    // Группируем по зонам
    const zoneGroups = {};
    records.forEach(record => {
      if (!zoneGroups[record.zoneName]) {
        zoneGroups[record.zoneName] = [];
      }
      zoneGroups[record.zoneName].push(record);
    });

    console.log('🗂️ СТРУКТУРА ПО ЗОНАМ:');
    console.log('======================');

    Object.keys(zoneGroups).forEach((zoneName, zoneIndex) => {
      const zoneRecords = zoneGroups[zoneName];
      console.log(`\n${zoneIndex + 1}. ${zoneName} (${zoneRecords.length} техкарт)`);
      
      // Группируем по группам помещений
      const roomGroups = {};
      zoneRecords.forEach(record => {
        if (!roomGroups[record.roomGroupName]) {
          roomGroups[record.roomGroupName] = [];
        }
        roomGroups[record.roomGroupName].push(record);
      });

      Object.keys(roomGroups).forEach((roomGroupName, rgIndex) => {
        const rgRecords = roomGroups[roomGroupName];
        console.log(`   📦 ${roomGroupName} (${rgRecords.length} техкарт)`);
        
        // Показываем первые 3 техкарты
        rgRecords.slice(0, 3).forEach((record, techIndex) => {
          console.log(`      🔧 ${record.cleaningObjectName} - ${record.techCardName}`);
          console.log(`         Периодичность: ${record.frequency}`);
        });
        
        if (rgRecords.length > 3) {
          console.log(`      ... и еще ${rgRecords.length - 3} техкарт`);
        }
      });
    });

    // Проверяем зону 7 (склад)
    console.log('\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ЗОНЫ 7 (СКЛАД):');
    console.log('===================================');
    
    const zone7Records = records.filter(r => r.zoneName && r.zoneName.includes('7. Склад'));
    
    if (zone7Records.length > 0) {
      console.log(`✅ Зона 7 найдена: ${zone7Records[0].zoneName}`);
      console.log(`📊 Техкарт в зоне: ${zone7Records.length}`);
      
      const zone7RoomGroups = {};
      zone7Records.forEach(record => {
        if (!zone7RoomGroups[record.roomGroupName]) {
          zone7RoomGroups[record.roomGroupName] = [];
        }
        zone7RoomGroups[record.roomGroupName].push(record);
      });
      
      console.log('\nГруппы помещений в Зоне 7:');
      Object.keys(zone7RoomGroups).forEach((roomGroup, index) => {
        const tasks = zone7RoomGroups[roomGroup];
        console.log(`${index + 1}. ${roomGroup} (${tasks.length} техкарт)`);
        tasks.forEach(task => {
          console.log(`   - ${task.cleaningObjectName}: ${task.techCardName} [${task.frequency}]`);
        });
      });
    } else {
      console.log('❌ Зона 7 не найдена');
    }

    // Тестируем API построения дерева
    console.log('\n🌳 ТЕСТИРОВАНИЕ API ПОСТРОЕНИЯ ДЕРЕВА:');
    console.log('======================================');
    
    const tree = buildDynamicTree(records);
    console.log(`Построено узлов верхнего уровня: ${tree.length}`);
    
    tree.forEach((node, index) => {
      console.log(`\n${index + 1}. ${getNodeIcon(node.type)} ${node.name} (${node.type})`);
      if (node.children && node.children.length > 0) {
        console.log(`   Дочерних узлов: ${node.children.length}`);
        showTreeLevel(node.children, 1);
      }
    });

    console.log('\n✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('Структура готова для использования в динамическом дереве');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function showTreeLevel(nodes, level, maxLevel = 2) {
  if (level > maxLevel) return;
  
  nodes.slice(0, 3).forEach(node => {
    const indent = '  '.repeat(level + 1);
    console.log(`${indent}${getNodeIcon(node.type)} ${node.name} (${node.type})`);
    
    if (node.children && node.children.length > 0 && level < maxLevel) {
      showTreeLevel(node.children, level + 1, maxLevel);
    }
  });
  
  if (nodes.length > 3) {
    const indent = '  '.repeat(level + 1);
    console.log(`${indent}... и еще ${nodes.length - 3} узлов`);
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

testNewPepsiStructure();
