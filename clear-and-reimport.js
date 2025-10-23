const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Функция для очистки строк от лишних символов и кавычек
function cleanString(str) {
  if (!str || str.trim() === '') return null;
  
  return str
    .trim()
    .replace(/^["']+|["']+$/g, '') // Убираем кавычки в начале и конце
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .replace(/\n+/g, ' ') // Заменяем переносы строк на пробелы
    .replace(/\t+/g, ' ') // Заменяем табы на пробелы
    .trim();
}

// Функция для парсинга данных из файла
function parseContextData() {
  console.log('📖 Читаем файл context_1.md...');
  
  const content = fs.readFileSync('context_1.md', 'utf8');
  const lines = content.split('\n');
  
  // Пропускаем заголовок (первая строка)
  const dataLines = lines.slice(1);
  
  console.log(`📊 Найдено ${dataLines.length} строк данных`);
  
  const parsedData = [];
  
  dataLines.forEach((line, index) => {
    if (line.trim()) {
      const columns = line.split('\t');
      
      if (columns.length >= 11) {
        const rowData = {
          objectName: cleanString(columns[0]),
          address: cleanString(columns[1]),
          site: cleanString(columns[2]),
          zone: cleanString(columns[3]),
          roomGroup: cleanString(columns[4]),
          room: cleanString(columns[5]),
          cleaningObject: cleanString(columns[6]),
          techTask: cleanString(columns[7]),
          frequency: cleanString(columns[8]),
          notes: cleanString(columns[9]),
          period: cleanString(columns[10])
        };
        
        // Добавляем только если есть название объекта
        if (rowData.objectName) {
          parsedData.push(rowData);
        }
      }
    }
  });
  
  console.log(`✅ Обработано ${parsedData.length} записей`);
  return parsedData;
}

// Функция для группировки данных по объектам
function groupDataByObjects(data) {
  console.log('🏗️ Группируем данные по объектам...');
  
  const objects = {};
  
  data.forEach(row => {
    const objName = row.objectName;
    
    if (!objects[objName]) {
      objects[objName] = {
        name: objName,
        address: row.address || 'Адрес не указан',
        items: []
      };
    }
    
    objects[objName].items.push(row);
  });
  
  console.log(`🏢 Найдено ${Object.keys(objects).length} уникальных объектов`);
  return objects;
}

// Функция для создания одного объекта
async function createSingleObject(objectData, adminUser) {
  console.log(`\n🏢 Создаем объект: ${objectData.name}`);
  
  try {
    // Создаем объект
    const cleaningObject = await prisma.cleaningObject.create({
      data: {
        name: objectData.name,
        address: objectData.address,
        creatorId: adminUser.id,
        timezone: 'Europe/Moscow',
        workingHours: { start: "08:00", end: "20:00" },
        workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        autoChecklistEnabled: true
      }
    });
    
    console.log(`  ✅ Объект создан с ID: ${cleaningObject.id}`);
    
    // Группируем элементы по иерархии
    const hierarchy = buildHierarchy(objectData.items);
    
    let totalTechTasks = 0;
    
    // Создаем участки
    for (const [siteName, siteData] of Object.entries(hierarchy.sites || {})) {
      console.log(`    📍 Создаем участок: ${siteName}`);
      
      const site = await prisma.site.create({
        data: {
          name: siteName,
          objectId: cleaningObject.id
        }
      });
      
      // Создаем зоны в участке
      for (const [zoneName, zoneData] of Object.entries(siteData.zones || {})) {
        console.log(`      🏗️ Создаем зону: ${zoneName}`);
        
        const zone = await prisma.zone.create({
          data: {
            name: zoneName,
            siteId: site.id
          }
        });
        
        // Создаем группы помещений в зоне
        for (const [roomGroupName, roomGroupData] of Object.entries(zoneData.roomGroups || {})) {
          console.log(`        📦 Создаем группу помещений: ${roomGroupName}`);
          
          const roomGroup = await prisma.roomGroup.create({
            data: {
              name: roomGroupName,
              zoneId: zone.id
            }
          });
          
          // Создаем помещения в группе
          for (const [roomName, roomData] of Object.entries(roomGroupData.rooms || {})) {
            console.log(`          🏠 Создаем помещение: ${roomName}`);
            
            const room = await prisma.room.create({
              data: {
                name: roomName,
                objectId: cleaningObject.id,
                roomGroupId: roomGroup.id
              }
            });
            
            // Создаем объекты уборки и техзадания
            totalTechTasks += await createCleaningObjectsAndTasks(roomData, cleaningObject.id, room.id);
          }
          
          // Прямые техзадания к группе помещений
          for (const task of roomGroupData.directTasks || []) {
            await createTechTask(task, cleaningObject.id, null, null);
            totalTechTasks++;
          }
        }
        
        // Прямые помещения в зоне
        for (const [roomName, roomData] of Object.entries(zoneData.directRooms || {})) {
          console.log(`        🏠 Создаем помещение в зоне: ${roomName}`);
          
          const room = await prisma.room.create({
            data: {
              name: roomName,
              objectId: cleaningObject.id
            }
          });
          
          totalTechTasks += await createCleaningObjectsAndTasks(roomData, cleaningObject.id, room.id);
        }
        
        // Прямые техзадания к зоне
        for (const task of zoneData.directTasks || []) {
          await createTechTask(task, cleaningObject.id, null, null);
          totalTechTasks++;
        }
      }
      
      // Прямые помещения в участке
      for (const [roomName, roomData] of Object.entries(siteData.directRooms || {})) {
        console.log(`      🏠 Создаем помещение в участке: ${roomName}`);
        
        const room = await prisma.room.create({
          data: {
            name: roomName,
            objectId: cleaningObject.id
          }
        });
        
        totalTechTasks += await createCleaningObjectsAndTasks(roomData, cleaningObject.id, room.id);
      }
      
      // Прямые техзадания к участку
      for (const task of siteData.directTasks || []) {
        await createTechTask(task, cleaningObject.id, null, null);
        totalTechTasks++;
      }
    }
    
    // Прямые помещения в объекте
    for (const [roomName, roomData] of Object.entries(hierarchy.directRooms || {})) {
      console.log(`    🏠 Создаем помещение в объекте: ${roomName}`);
      
      const room = await prisma.room.create({
        data: {
          name: roomName,
          objectId: cleaningObject.id
        }
      });
      
      totalTechTasks += await createCleaningObjectsAndTasks(roomData, cleaningObject.id, room.id);
    }
    
    // Прямые техзадания к объекту
    for (const task of hierarchy.directTasks || []) {
      await createTechTask(task, cleaningObject.id, null, null);
      totalTechTasks++;
    }
    
    console.log(`  ✅ Объект "${objectData.name}" создан с ${totalTechTasks} техзаданиями`);
    return { success: true, techTasks: totalTechTasks };
    
  } catch (error) {
    console.error(`  ❌ Ошибка создания объекта "${objectData.name}":`, error.message);
    return { success: false, error: error.message };
  }
}

// Функция для построения иерархии из элементов
function buildHierarchy(items) {
  const hierarchy = {
    sites: {},
    directRooms: {},
    directTasks: []
  };
  
  items.forEach(item => {
    if (item.site) {
      // Есть участок
      if (!hierarchy.sites[item.site]) {
        hierarchy.sites[item.site] = {
          zones: {},
          directRooms: {},
          directTasks: []
        };
      }
      
      if (item.zone) {
        // Есть зона
        if (!hierarchy.sites[item.site].zones[item.zone]) {
          hierarchy.sites[item.site].zones[item.zone] = {
            roomGroups: {},
            directRooms: {},
            directTasks: []
          };
        }
        
        if (item.roomGroup) {
          // Есть группа помещений
          if (!hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup]) {
            hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup] = {
              rooms: {},
              directTasks: []
            };
          }
          
          if (item.room) {
            // Есть помещение в группе
            if (!hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].rooms[item.room]) {
              hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].rooms[item.room] = {
                cleaningObjects: {},
                directTasks: []
              };
            }
            
            if (item.cleaningObject && item.techTask) {
              // Техзадание к объекту уборки
              if (!hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].rooms[item.room].cleaningObjects[item.cleaningObject]) {
                hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].rooms[item.room].cleaningObjects[item.cleaningObject] = [];
              }
              hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].rooms[item.room].cleaningObjects[item.cleaningObject].push(item);
            } else if (item.techTask) {
              // Прямое техзадание к помещению
              hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].rooms[item.room].directTasks.push(item);
            }
          } else if (item.techTask) {
            // Прямое техзадание к группе помещений
            hierarchy.sites[item.site].zones[item.zone].roomGroups[item.roomGroup].directTasks.push(item);
          }
        } else if (item.room) {
          // Помещение напрямую в зоне
          if (!hierarchy.sites[item.site].zones[item.zone].directRooms[item.room]) {
            hierarchy.sites[item.site].zones[item.zone].directRooms[item.room] = {
              cleaningObjects: {},
              directTasks: []
            };
          }
          
          if (item.cleaningObject && item.techTask) {
            if (!hierarchy.sites[item.site].zones[item.zone].directRooms[item.room].cleaningObjects[item.cleaningObject]) {
              hierarchy.sites[item.site].zones[item.zone].directRooms[item.room].cleaningObjects[item.cleaningObject] = [];
            }
            hierarchy.sites[item.site].zones[item.zone].directRooms[item.room].cleaningObjects[item.cleaningObject].push(item);
          } else if (item.techTask) {
            hierarchy.sites[item.site].zones[item.zone].directRooms[item.room].directTasks.push(item);
          }
        } else if (item.techTask) {
          // Прямое техзадание к зоне
          hierarchy.sites[item.site].zones[item.zone].directTasks.push(item);
        }
      } else if (item.room) {
        // Помещение напрямую в участке
        if (!hierarchy.sites[item.site].directRooms[item.room]) {
          hierarchy.sites[item.site].directRooms[item.room] = {
            cleaningObjects: {},
            directTasks: []
          };
        }
        
        if (item.cleaningObject && item.techTask) {
          if (!hierarchy.sites[item.site].directRooms[item.room].cleaningObjects[item.cleaningObject]) {
            hierarchy.sites[item.site].directRooms[item.room].cleaningObjects[item.cleaningObject] = [];
          }
          hierarchy.sites[item.site].directRooms[item.room].cleaningObjects[item.cleaningObject].push(item);
        } else if (item.techTask) {
          hierarchy.sites[item.site].directRooms[item.room].directTasks.push(item);
        }
      } else if (item.techTask) {
        // Прямое техзадание к участку
        hierarchy.sites[item.site].directTasks.push(item);
      }
    } else if (item.room) {
      // Помещение напрямую в объекте
      if (!hierarchy.directRooms[item.room]) {
        hierarchy.directRooms[item.room] = {
          cleaningObjects: {},
          directTasks: []
        };
      }
      
      if (item.cleaningObject && item.techTask) {
        if (!hierarchy.directRooms[item.room].cleaningObjects[item.cleaningObject]) {
          hierarchy.directRooms[item.room].cleaningObjects[item.cleaningObject] = [];
        }
        hierarchy.directRooms[item.room].cleaningObjects[item.cleaningObject].push(item);
      } else if (item.techTask) {
        hierarchy.directRooms[item.room].directTasks.push(item);
      }
    } else if (item.techTask) {
      // Прямое техзадание к объекту
      hierarchy.directTasks.push(item);
    }
  });
  
  return hierarchy;
}

// Функция для создания объектов уборки и техзаданий
async function createCleaningObjectsAndTasks(roomData, objectId, roomId) {
  let taskCount = 0;
  
  // Создаем объекты уборки
  for (const [cleaningObjectName, tasks] of Object.entries(roomData.cleaningObjects || {})) {
    console.log(`            🧹 Создаем объект уборки: ${cleaningObjectName}`);
    
    const cleaningObjectItem = await prisma.cleaningObjectItem.create({
      data: {
        name: cleaningObjectName,
        roomId: roomId
      }
    });
    
    // Создаем техзадания для объекта уборки
    for (const task of tasks) {
      await createTechTask(task, objectId, roomId, cleaningObjectItem.id);
      taskCount++;
    }
  }
  
  // Создаем прямые техзадания к помещению
  for (const task of roomData.directTasks || []) {
    await createTechTask(task, objectId, roomId, null);
    taskCount++;
  }
  
  return taskCount;
}

// Функция для создания техзадания
async function createTechTask(taskData, objectId, roomId, cleaningObjectItemId) {
  await prisma.techCard.create({
    data: {
      name: taskData.techTask,
      workType: 'Уборка',
      frequency: taskData.frequency || 'По требованию',
      description: taskData.techTask,
      notes: taskData.notes,
      period: taskData.period,
      objectId: objectId,
      roomId: roomId,
      cleaningObjectItemId: cleaningObjectItemId
    }
  });
}

// Основная функция
async function main() {
  try {
    console.log('🚀 Начинаем полную переработку данных...');
    
    // Очищаем существующие данные
    console.log('🧹 Очищаем существующие данные...');
    await prisma.techCard.deleteMany();
    await prisma.cleaningObjectItem.deleteMany();
    await prisma.room.deleteMany();
    await prisma.roomGroup.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.site.deleteMany();
    await prisma.cleaningObject.deleteMany();
    
    // Создаем админа если его нет
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.log('👤 Создаем администратора...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@cleaning.com',
          name: 'Администратор',
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          role: 'ADMIN'
        }
      });
    }
    
    // Парсим данные
    const rawData = parseContextData();
    const objectsData = groupDataByObjects(rawData);
    
    let totalObjects = 0;
    let totalTechTasks = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Создаем объекты по одному
    for (const [objectName, objectData] of Object.entries(objectsData)) {
      const result = await createSingleObject(objectData, adminUser);
      
      totalObjects++;
      
      if (result.success) {
        successCount++;
        totalTechTasks += result.techTasks;
      } else {
        errorCount++;
        console.error(`❌ Ошибка с объектом "${objectName}": ${result.error}`);
      }
      
      // Небольшая пауза между объектами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 ИМПОРТ ЗАВЕРШЕН!');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`  🏢 Всего объектов: ${totalObjects}`);
    console.log(`  ✅ Успешно создано: ${successCount}`);
    console.log(`  ❌ Ошибок: ${errorCount}`);
    console.log(`  📋 Всего техзаданий: ${totalTechTasks}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем
main();
