const fetch = require('node-fetch');

async function testApiResponse() {
  try {
    console.log('🧪 ТЕСТИРОВАНИЕ API OBJECT-STRUCTURE');
    console.log('====================================\n');

    const pepsiObjectId = 'cmgzb2qtl0001vy7s2wczkws4';
    const url = `http://localhost:3002/api/object-structure?objectId=${pepsiObjectId}`;
    
    console.log(`🌐 URL: ${url}\n`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 ОТВЕТ API:');
    console.log('=============');
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${data.success}`);
    console.log(`Total Records: ${data.totalRecords}`);
    console.log(`Tree Nodes: ${data.data?.length || 0}\n`);
    
    if (data.success && data.data) {
      console.log('🌳 СТРУКТУРА ДЕРЕВА:');
      console.log('====================');
      
      function printTree(nodes, level = 0) {
        nodes.forEach((node, index) => {
          const indent = '  '.repeat(level);
          const childrenCount = node.children?.length || 0;
          console.log(`${indent}${index + 1}. ${getIcon(node.type)} ${node.name} (${node.type}) - ${childrenCount} детей`);
          
          if (node.children && node.children.length > 0 && level < 5) {
            printTree(node.children, level + 1);
          }
        });
      }
      
      printTree(data.data);
      
      // Проверяем конкретно Зону 7
      console.log('\n🔍 ПОИСК ЗОНЫ 7:');
      console.log('================');
      
      function findZone7(nodes, path = []) {
        for (const node of nodes) {
          const currentPath = [...path, node.name];
          
          if (node.name.includes('7. Склад')) {
            console.log(`✅ Найдена Зона 7: ${node.name}`);
            console.log(`   Путь: ${currentPath.join(' → ')}`);
            console.log(`   Детей: ${node.children?.length || 0}`);
            
            if (node.children && node.children.length > 0) {
              console.log('   Дочерние узлы:');
              node.children.forEach((child, index) => {
                console.log(`   ${index + 1}. ${child.name} (${child.type}) - ${child.children?.length || 0} детей`);
              });
            }
            return true;
          }
          
          if (node.children && node.children.length > 0) {
            if (findZone7(node.children, currentPath)) {
              return true;
            }
          }
        }
        return false;
      }
      
      if (!findZone7(data.data)) {
        console.log('❌ Зона 7 не найдена в дереве');
      }
      
    } else {
      console.log('❌ ОШИБКА API:');
      console.log(JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error.message);
  }
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

testApiResponse();
