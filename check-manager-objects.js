const { PrismaClient } = require('@prisma/client');

async function checkManagerObjects() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 ПРОВЕРКА ОБЪЕКТОВ МЕНЕДЖЕРОВ\n');
    
    // Найдем менеджера Шодиеву
    const shodieva = await prisma.user.findFirst({
      where: {
        role: 'MANAGER',
        name: {
          contains: 'Шодиева'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    if (!shodieva) {
      console.log('❌ Менеджер Шодиева не найдена');
      return;
    }
    
    console.log('👤 Найден менеджер:');
    console.log(`   ID: ${shodieva.id}`);
    console.log(`   Имя: ${shodieva.name}`);
    console.log(`   Email: ${shodieva.email}`);
    console.log('');
    
    // Проверим объекты, назначенные этому менеджеру
    const assignedObjects = await prisma.cleaningObject.findMany({
      where: {
        managerId: shodieva.id
      },
      select: {
        id: true,
        name: true,
        address: true,
        managerId: true,
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`🏢 Объекты, назначенные менеджеру (${assignedObjects.length}):`);
    if (assignedObjects.length === 0) {
      console.log('   ❌ Нет назначенных объектов');
    } else {
      assignedObjects.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name}`);
        console.log(`      ID: ${obj.id}`);
        console.log(`      Адрес: ${obj.address}`);
        console.log(`      Менеджер: ${obj.manager?.name || 'Не назначен'}`);
        console.log('');
      });
    }
    
    // Проверим API объектов для этого менеджера
    console.log('🔌 Тестируем API объектов...');
    
    // Сначала войдем как этот менеджер
    const fetch = require('node-fetch');
    
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: shodieva.email,
        password: 'manager123'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Не удалось войти как менеджер');
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie');
    
    // Проверяем API объектов
    const objectsResponse = await fetch('http://localhost:3002/api/objects', {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (objectsResponse.ok) {
      const apiObjects = await objectsResponse.json();
      console.log(`   ✅ API /api/objects вернул: ${apiObjects.length} объектов`);
      
      if (apiObjects.length > 0) {
        console.log('   📋 Объекты из API:');
        apiObjects.forEach((obj, index) => {
          console.log(`      ${index + 1}. ${obj.name} (ID: ${obj.id})`);
        });
      }
    } else {
      console.log(`   ❌ Ошибка API /api/objects: ${objectsResponse.status}`);
    }
    
    // Проверяем API с параметром my=true
    const myObjectsResponse = await fetch('http://localhost:3002/api/objects?my=true', {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (myObjectsResponse.ok) {
      const myApiObjects = await myObjectsResponse.json();
      console.log(`   ✅ API /api/objects?my=true вернул: ${myApiObjects.length} объектов`);
      
      if (myApiObjects.length > 0) {
        console.log('   📋 "Мои" объекты из API:');
        myApiObjects.forEach((obj, index) => {
          console.log(`      ${index + 1}. ${obj.name} (ID: ${obj.id})`);
        });
      }
    } else {
      console.log(`   ❌ Ошибка API /api/objects?my=true: ${myObjectsResponse.status}`);
    }
    
    // Проверим несколько других менеджеров для сравнения
    console.log('\n📊 СРАВНЕНИЕ С ДРУГИМИ МЕНЕДЖЕРАМИ:');
    
    const otherManagers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        id: { not: shodieva.id }
      },
      take: 3,
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    for (const manager of otherManagers) {
      const managerObjects = await prisma.cleaningObject.count({
        where: { managerId: manager.id }
      });
      
      console.log(`   👤 ${manager.name}: ${managerObjects} объектов`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkManagerObjects();
