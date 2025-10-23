const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPepsiFullData() {
  try {
    console.log('🔍 ПОЛНАЯ ПРОВЕРКА ДАННЫХ ПЕПСИ');
    console.log('===============================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';

    // Получаем все записи
    const allRecords = await prisma.objectStructure.findMany({
      where: { objectId: pepsiObjectId },
      orderBy: [
        { zoneName: 'asc' },
        { roomGroupName: 'asc' },
        { roomName: 'asc' }
      ]
    });

    console.log(`📊 ВСЕГО ЗАПИСЕЙ В БАЗЕ: ${allRecords.length}\n`);

    // Показываем все записи подробно
    console.log('📋 ВСЕ ЗАПИСИ В БАЗЕ:');
    console.log('====================');
    
    allRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. ЗАПИСЬ ID: ${record.id}`);
      console.log(`   Объект: ${record.objectName}`);
      console.log(`   Участок: ${record.siteName || 'НЕТ'}`);
      console.log(`   Зона: ${record.zoneName || 'НЕТ'}`);
      console.log(`   Группа помещений: ${record.roomGroupName || 'НЕТ'}`);
      console.log(`   Помещение: ${record.roomName || 'НЕТ'}`);
      console.log(`   Объект уборки: ${record.cleaningObjectName || 'НЕТ'}`);
      console.log(`   Техкарта: ${record.techCardName}`);
      console.log(`   Периодичность: ${record.frequency}`);
      console.log(`   Тип работы: ${record.workType || 'НЕТ'}`);
      console.log(`   Описание: ${record.description || 'НЕТ'}`);
      console.log(`   Примечания: ${record.notes || 'НЕТ'}`);
      console.log(`   Период: ${record.period || 'НЕТ'}`);
    });

    // Анализируем структуру
    console.log('\n\n🏗️ АНАЛИЗ СТРУКТУРЫ:');
    console.log('====================');

    // Уникальные участки
    const sites = [...new Set(allRecords.map(r => r.siteName).filter(Boolean))];
    console.log(`\n📍 УЧАСТКИ (${sites.length}):`);
    sites.forEach((site, index) => {
      console.log(`${index + 1}. ${site}`);
    });

    // Уникальные зоны
    const zones = [...new Set(allRecords.map(r => r.zoneName).filter(Boolean))];
    console.log(`\n🏗️ ЗОНЫ (${zones.length}):`);
    zones.forEach((zone, index) => {
      const zoneRecords = allRecords.filter(r => r.zoneName === zone);
      console.log(`${index + 1}. ${zone} (${zoneRecords.length} техкарт)`);
    });

    // Уникальные группы помещений
    const roomGroups = [...new Set(allRecords.map(r => r.roomGroupName).filter(Boolean))];
    console.log(`\n📦 ГРУППЫ ПОМЕЩЕНИЙ (${roomGroups.length}):`);
    roomGroups.forEach((rg, index) => {
      const rgRecords = allRecords.filter(r => r.roomGroupName === rg);
      const zone = rgRecords[0]?.zoneName;
      console.log(`${index + 1}. ${rg} → ${zone} (${rgRecords.length} техкарт)`);
    });

    // Уникальные помещения
    const rooms = [...new Set(allRecords.map(r => r.roomName).filter(Boolean))];
    console.log(`\n🏠 ПОМЕЩЕНИЯ (${rooms.length}):`);
    rooms.forEach((room, index) => {
      const roomRecords = allRecords.filter(r => r.roomName === room);
      const roomGroup = roomRecords[0]?.roomGroupName;
      console.log(`${index + 1}. ${room} → ${roomGroup} (${roomRecords.length} техкарт)`);
    });

    // Уникальные объекты уборки
    const cleaningObjects = [...new Set(allRecords.map(r => r.cleaningObjectName).filter(Boolean))];
    console.log(`\n🧹 ОБЪЕКТЫ УБОРКИ (${cleaningObjects.length}):`);
    cleaningObjects.forEach((co, index) => {
      const coRecords = allRecords.filter(r => r.cleaningObjectName === co);
      console.log(`${index + 1}. ${co} (${coRecords.length} техкарт)`);
    });

    // Проверяем, есть ли проблемы с данными
    console.log('\n\n⚠️ ПРОВЕРКА НА ПРОБЛЕМЫ:');
    console.log('========================');

    const noSite = allRecords.filter(r => !r.siteName);
    const noZone = allRecords.filter(r => !r.zoneName);
    const noRoomGroup = allRecords.filter(r => !r.roomGroupName);
    const noRoom = allRecords.filter(r => !r.roomName);
    const noCleaningObject = allRecords.filter(r => !r.cleaningObjectName);

    console.log(`Записей без участка: ${noSite.length}`);
    console.log(`Записей без зоны: ${noZone.length}`);
    console.log(`Записей без группы помещений: ${noRoomGroup.length}`);
    console.log(`Записей без помещения: ${noRoom.length}`);
    console.log(`Записей без объекта уборки: ${noCleaningObject.length}`);

    if (noSite.length > 0) {
      console.log('\n❌ ЗАПИСИ БЕЗ УЧАСТКА:');
      noSite.forEach(r => console.log(`- ${r.techCardName}`));
    }

    if (noZone.length > 0) {
      console.log('\n❌ ЗАПИСИ БЕЗ ЗОНЫ:');
      noZone.forEach(r => console.log(`- ${r.techCardName}`));
    }

    // Тестируем построение дерева
    console.log('\n\n🌳 ТЕСТ ПОСТРОЕНИЯ ДЕРЕВА:');
    console.log('==========================');
    
    const tree = buildTree(allRecords);
    console.log(`Построено узлов верхнего уровня: ${tree.length}`);
    
    function printTree(nodes, level = 0) {
      nodes.forEach(node => {
        const indent = '  '.repeat(level);
        console.log(`${indent}${getIcon(node.type)} ${node.name} (${node.type}) - ${node.children?.length || 0} детей`);
        
        if (node.children && node.children.length > 0 && level < 4) {
          printTree(node.children, level + 1);
        }
      });
    }
    
    printTree(tree);

    console.log('\n✅ ПРОВЕРКА ЗАВЕРШЕНА');

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function buildTree(records) {
  const tree = {};

  records.forEach(record => {
    const path = [];
    
    if (record.siteName) path.push({ type: 'site', name: record.siteName });
    if (record.zoneName) path.push({ type: 'zone', name: record.zoneName });
    if (record.roomGroupName) path.push({ type: 'roomGroup', name: record.roomGroupName });
    if (record.roomName) path.push({ type: 'room', name: record.roomName });
    if (record.cleaningObjectName) path.push({ type: 'cleaningObject', name: record.cleaningObjectName });
    
    path.push({ 
      type: 'techCard', 
      name: record.techCardName,
      frequency: record.frequency,
      workType: record.workType,
      description: record.description
    });

    let current = tree;
    
    path.forEach((node) => {
      const key = `${node.type}:${node.name}`;
      
      if (!current[key]) {
        current[key] = {
          type: node.type,
          name: node.name,
          children: {},
          ...(node.type === 'techCard' && {
            frequency: node.frequency,
            workType: node.workType,
            description: node.description
          })
        };
      }
      
      current = current[key].children;
    });
  });

  return convertToArray(tree);
}

function convertToArray(tree) {
  return Object.values(tree).map((node) => ({
    ...node,
    children: node.children && Object.keys(node.children).length > 0 
      ? convertToArray(node.children) 
      : []
  }));
}

function getIcon(type) {
  switch (type) {
    case 'site': return '🏗️';
    case 'zone': return '📍';
    case 'roomGroup': return '📦';
    case 'room': return '🏠';
    case 'cleaningObject': return '🧹';
    case 'techCard': return '🔧';
    default: return '📄';
  }
}

checkPepsiFullData();
