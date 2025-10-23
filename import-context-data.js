const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Функция для очистки строк от лишних символов
function cleanString(str) {
  if (!str || str.trim() === '') return null;
  return str.trim().replace(/\s+/g, ' ');
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

// Функция для группировки данных по иерархии
function groupDataByHierarchy(data) {
  console.log('🏗️ Группируем данные по иерархии...');
  
  const hierarchy = {};
  
  data.forEach(row => {
    const objName = row.objectName;
    
    if (!hierarchy[objName]) {
      hierarchy[objName] = {
        name: objName,
        address: row.address,
        sites: {}
      };
    }
    
    // Если есть участок
    if (row.site) {
      if (!hierarchy[objName].sites[row.site]) {
        hierarchy[objName].sites[row.site] = {
          name: row.site,
          zones: {}
        };
      }
      
      // Если есть зона
      if (row.zone) {
        const siteName = row.site;
        if (!hierarchy[objName].sites[siteName].zones[row.zone]) {
          hierarchy[objName].sites[siteName].zones[row.zone] = {
            name: row.zone,
            roomGroups: {}
          };
        }
        
        // Если есть группа помещений
        if (row.roomGroup) {
          const zoneName = row.zone;
          if (!hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[row.roomGroup]) {
            hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[row.roomGroup] = {
              name: row.roomGroup,
              rooms: {}
            };
          }
          
          // Если есть помещение
          if (row.room) {
            const roomGroupName = row.roomGroup;
            if (!hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[row.room]) {
              hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[row.room] = {
                name: row.room,
                cleaningObjects: {}
              };
            }
            
            // Если есть объект уборки
            if (row.cleaningObject) {
              const roomName = row.room;
              if (!hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[roomName].cleaningObjects[row.cleaningObject]) {
                hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[roomName].cleaningObjects[row.cleaningObject] = {
                  name: row.cleaningObject,
                  techCards: []
                };
              }
              
              // Добавляем техкарту
              if (row.techTask) {
                hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[roomName].cleaningObjects[row.cleaningObject].techCards.push({
                  name: row.techTask,
                  frequency: row.frequency,
                  notes: row.notes,
                  period: row.period
                });
              }
            } else if (row.techTask) {
              // Техкарта напрямую к помещению
              if (!hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[row.room].directTechCards) {
                hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[row.room].directTechCards = [];
              }
              hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[roomGroupName].rooms[row.room].directTechCards.push({
                name: row.techTask,
                frequency: row.frequency,
                notes: row.notes,
                period: row.period
              });
            }
          } else if (row.techTask) {
            // Техкарта напрямую к группе помещений
            if (!hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[row.roomGroup].directTechCards) {
              hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[row.roomGroup].directTechCards = [];
            }
            hierarchy[objName].sites[siteName].zones[zoneName].roomGroups[row.roomGroup].directTechCards.push({
              name: row.techTask,
              frequency: row.frequency,
              notes: row.notes,
              period: row.period
            });
          }
        } else if (row.room) {
          // Помещение напрямую в зоне
          if (!hierarchy[objName].sites[siteName].zones[row.zone].directRooms) {
            hierarchy[objName].sites[siteName].zones[row.zone].directRooms = {};
          }
          if (!hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room]) {
            hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room] = {
              name: row.room,
              cleaningObjects: {}
            };
          }
          
          if (row.cleaningObject) {
            if (!hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room].cleaningObjects[row.cleaningObject]) {
              hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room].cleaningObjects[row.cleaningObject] = {
                name: row.cleaningObject,
                techCards: []
              };
            }
            
            if (row.techTask) {
              hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room].cleaningObjects[row.cleaningObject].techCards.push({
                name: row.techTask,
                frequency: row.frequency,
                notes: row.notes,
                period: row.period
              });
            }
          } else if (row.techTask) {
            if (!hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room].directTechCards) {
              hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room].directTechCards = [];
            }
            hierarchy[objName].sites[siteName].zones[row.zone].directRooms[row.room].directTechCards.push({
              name: row.techTask,
              frequency: row.frequency,
              notes: row.notes,
              period: row.period
            });
          }
        } else if (row.techTask) {
          // Техкарта напрямую к зоне
          if (!hierarchy[objName].sites[siteName].zones[row.zone].directTechCards) {
            hierarchy[objName].sites[siteName].zones[row.zone].directTechCards = [];
          }
          hierarchy[objName].sites[siteName].zones[row.zone].directTechCards.push({
            name: row.techTask,
            frequency: row.frequency,
            notes: row.notes,
            period: row.period
          });
        }
      } else if (row.room) {
        // Помещение напрямую в участке
        if (!hierarchy[objName].sites[row.site].directRooms) {
          hierarchy[objName].sites[row.site].directRooms = {};
        }
        if (!hierarchy[objName].sites[row.site].directRooms[row.room]) {
          hierarchy[objName].sites[row.site].directRooms[row.room] = {
            name: row.room,
            cleaningObjects: {}
          };
        }
        
        if (row.cleaningObject) {
          if (!hierarchy[objName].sites[row.site].directRooms[row.room].cleaningObjects[row.cleaningObject]) {
            hierarchy[objName].sites[row.site].directRooms[row.room].cleaningObjects[row.cleaningObject] = {
              name: row.cleaningObject,
              techCards: []
            };
          }
          
          if (row.techTask) {
            hierarchy[objName].sites[row.site].directRooms[row.room].cleaningObjects[row.cleaningObject].techCards.push({
              name: row.techTask,
              frequency: row.frequency,
              notes: row.notes,
              period: row.period
            });
          }
        } else if (row.techTask) {
          if (!hierarchy[objName].sites[row.site].directRooms[row.room].directTechCards) {
            hierarchy[objName].sites[row.site].directRooms[row.room].directTechCards = [];
          }
          hierarchy[objName].sites[row.site].directRooms[row.room].directTechCards.push({
            name: row.techTask,
            frequency: row.frequency,
            notes: row.notes,
            period: row.period
          });
        }
      } else if (row.techTask) {
        // Техкарта напрямую к участку
        if (!hierarchy[objName].sites[row.site].directTechCards) {
          hierarchy[objName].sites[row.site].directTechCards = [];
        }
        hierarchy[objName].sites[row.site].directTechCards.push({
          name: row.techTask,
          frequency: row.frequency,
          notes: row.notes,
          period: row.period
        });
      }
    } else if (row.room) {
      // Помещение напрямую в объекте
      if (!hierarchy[objName].directRooms) {
        hierarchy[objName].directRooms = {};
      }
      if (!hierarchy[objName].directRooms[row.room]) {
        hierarchy[objName].directRooms[row.room] = {
          name: row.room,
          cleaningObjects: {}
        };
      }
      
      if (row.cleaningObject) {
        if (!hierarchy[objName].directRooms[row.room].cleaningObjects[row.cleaningObject]) {
          hierarchy[objName].directRooms[row.room].cleaningObjects[row.cleaningObject] = {
            name: row.cleaningObject,
            techCards: []
          };
        }
        
        if (row.techTask) {
          hierarchy[objName].directRooms[row.room].cleaningObjects[row.cleaningObject].techCards.push({
            name: row.techTask,
            frequency: row.frequency,
            notes: row.notes,
            period: row.period
          });
        }
      } else if (row.techTask) {
        if (!hierarchy[objName].directRooms[row.room].directTechCards) {
          hierarchy[objName].directRooms[row.room].directTechCards = [];
        }
        hierarchy[objName].directRooms[row.room].directTechCards.push({
          name: row.techTask,
          frequency: row.frequency,
          notes: row.notes,
          period: row.period
        });
      }
    } else if (row.techTask) {
      // Техкарта напрямую к объекту
      if (!hierarchy[objName].directTechCards) {
        hierarchy[objName].directTechCards = [];
      }
      hierarchy[objName].directTechCards.push({
        name: row.techTask,
        frequency: row.frequency,
        notes: row.notes,
        period: row.period
      });
    }
  });
  
  console.log(`🏢 Найдено ${Object.keys(hierarchy).length} уникальных объектов`);
  return hierarchy;
}

// Основная функция импорта
async function importData() {
  try {
    console.log('🚀 Начинаем импорт данных из context_1.md...');
    
    // Очищаем существующие данные
    console.log('🧹 Очищаем существующие данные...');
    await prisma.techCard.deleteMany();
    await prisma.cleaningObjectItem.deleteMany();
    await prisma.room.deleteMany();
    await prisma.roomGroup.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.site.deleteMany();
    await prisma.cleaningObject.deleteMany();
    
    // Парсим данные
    const rawData = parseContextData();
    const hierarchy = groupDataByHierarchy(rawData);
    
    // Создаем админа для объектов
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.log('👤 Создаем администратора...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@cleaning.com',
          name: 'Администратор',
          password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
          role: 'ADMIN'
        }
      });
    }
    
    let totalObjects = 0;
    let totalSites = 0;
    let totalZones = 0;
    let totalRoomGroups = 0;
    let totalRooms = 0;
    let totalCleaningObjects = 0;
    let totalTechCards = 0;
    
    // Импортируем данные
    for (const [objectName, objectData] of Object.entries(hierarchy)) {
      console.log(`\n🏢 Создаем объект: ${objectName}`);
      
      const cleaningObject = await prisma.cleaningObject.create({
        data: {
          name: objectName,
          address: objectData.address || 'Адрес не указан',
          creatorId: adminUser.id,
          timezone: 'Europe/Moscow',
          workingHours: { start: "08:00", end: "20:00" },
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
          autoChecklistEnabled: true
        }
      });
      totalObjects++;
      
      // Создаем участки
      for (const [siteName, siteData] of Object.entries(objectData.sites || {})) {
        console.log(`  📍 Создаем участок: ${siteName}`);
        
        const site = await prisma.site.create({
          data: {
            name: siteName,
            objectId: cleaningObject.id
          }
        });
        totalSites++;
        
        // Создаем зоны
        for (const [zoneName, zoneData] of Object.entries(siteData.zones || {})) {
          console.log(`    🏗️ Создаем зону: ${zoneName}`);
          
          const zone = await prisma.zone.create({
            data: {
              name: zoneName,
              siteId: site.id
            }
          });
          totalZones++;
          
          // Создаем группы помещений
          for (const [roomGroupName, roomGroupData] of Object.entries(zoneData.roomGroups || {})) {
            console.log(`      📦 Создаем группу помещений: ${roomGroupName}`);
            
            const roomGroup = await prisma.roomGroup.create({
              data: {
                name: roomGroupName,
                zoneId: zone.id
              }
            });
            totalRoomGroups++;
            
            // Создаем помещения в группе
            for (const [roomName, roomData] of Object.entries(roomGroupData.rooms || {})) {
              console.log(`        🏠 Создаем помещение: ${roomName}`);
              
              const room = await prisma.room.create({
                data: {
                  name: roomName,
                  objectId: cleaningObject.id,
                  roomGroupId: roomGroup.id
                }
              });
              totalRooms++;
              
              // Создаем объекты уборки
              for (const [cleaningObjectName, cleaningObjectData] of Object.entries(roomData.cleaningObjects || {})) {
                console.log(`          🧹 Создаем объект уборки: ${cleaningObjectName}`);
                
                const cleaningObjectItem = await prisma.cleaningObjectItem.create({
                  data: {
                    name: cleaningObjectName,
                    roomId: room.id
                  }
                });
                totalCleaningObjects++;
                
                // Создаем техкарты
                for (const techCardData of cleaningObjectData.techCards || []) {
                  const techCard = await prisma.techCard.create({
                    data: {
                      name: techCardData.name,
                      workType: 'Уборка',
                      frequency: techCardData.frequency || 'По требованию',
                      description: techCardData.name,
                      notes: techCardData.notes,
                      period: techCardData.period,
                      objectId: cleaningObject.id,
                      roomId: room.id,
                      cleaningObjectItemId: cleaningObjectItem.id
                    }
                  });
                  totalTechCards++;
                }
              }
              
              // Прямые техкарты к помещению
              for (const techCardData of roomData.directTechCards || []) {
                const techCard = await prisma.techCard.create({
                  data: {
                    name: techCardData.name,
                    workType: 'Уборка',
                    frequency: techCardData.frequency || 'По требованию',
                    description: techCardData.name,
                    notes: techCardData.notes,
                    period: techCardData.period,
                    objectId: cleaningObject.id,
                    roomId: room.id
                  }
                });
                totalTechCards++;
              }
            }
            
            // Прямые техкарты к группе помещений
            for (const techCardData of roomGroupData.directTechCards || []) {
              const techCard = await prisma.techCard.create({
                data: {
                  name: techCardData.name,
                  workType: 'Уборка',
                  frequency: techCardData.frequency || 'По требованию',
                  description: techCardData.name,
                  notes: techCardData.notes,
                  period: techCardData.period,
                  objectId: cleaningObject.id
                }
              });
              totalTechCards++;
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
            totalRooms++;
            
            // Создаем объекты уборки
            for (const [cleaningObjectName, cleaningObjectData] of Object.entries(roomData.cleaningObjects || {})) {
              console.log(`          🧹 Создаем объект уборки: ${cleaningObjectName}`);
              
              const cleaningObjectItem = await prisma.cleaningObjectItem.create({
                data: {
                  name: cleaningObjectName,
                  roomId: room.id
                }
              });
              totalCleaningObjects++;
              
              // Создаем техкарты
              for (const techCardData of cleaningObjectData.techCards || []) {
                const techCard = await prisma.techCard.create({
                  data: {
                    name: techCardData.name,
                    workType: 'Уборка',
                    frequency: techCardData.frequency || 'По требованию',
                    description: techCardData.name,
                    notes: techCardData.notes,
                    period: techCardData.period,
                    objectId: cleaningObject.id,
                    roomId: room.id,
                    cleaningObjectItemId: cleaningObjectItem.id
                  }
                });
                totalTechCards++;
              }
            }
            
            // Прямые техкарты к помещению
            for (const techCardData of roomData.directTechCards || []) {
              const techCard = await prisma.techCard.create({
                data: {
                  name: techCardData.name,
                  workType: 'Уборка',
                  frequency: techCardData.frequency || 'По требованию',
                  description: techCardData.name,
                  notes: techCardData.notes,
                  period: techCardData.period,
                  objectId: cleaningObject.id,
                  roomId: room.id
                }
              });
              totalTechCards++;
            }
          }
          
          // Прямые техкарты к зоне
          for (const techCardData of zoneData.directTechCards || []) {
            const techCard = await prisma.techCard.create({
              data: {
                name: techCardData.name,
                workType: 'Уборка',
                frequency: techCardData.frequency || 'По требованию',
                description: techCardData.name,
                notes: techCardData.notes,
                period: techCardData.period,
                objectId: cleaningObject.id
              }
            });
            totalTechCards++;
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
          totalRooms++;
          
          // Создаем объекты уборки
          for (const [cleaningObjectName, cleaningObjectData] of Object.entries(roomData.cleaningObjects || {})) {
            console.log(`        🧹 Создаем объект уборки: ${cleaningObjectName}`);
            
            const cleaningObjectItem = await prisma.cleaningObjectItem.create({
              data: {
                name: cleaningObjectName,
                roomId: room.id
              }
            });
            totalCleaningObjects++;
            
            // Создаем техкарты
            for (const techCardData of cleaningObjectData.techCards || []) {
              const techCard = await prisma.techCard.create({
                data: {
                  name: techCardData.name,
                  workType: 'Уборка',
                  frequency: techCardData.frequency || 'По требованию',
                  description: techCardData.name,
                  notes: techCardData.notes,
                  period: techCardData.period,
                  objectId: cleaningObject.id,
                  roomId: room.id,
                  cleaningObjectItemId: cleaningObjectItem.id
                }
              });
              totalTechCards++;
            }
          }
          
          // Прямые техкарты к помещению
          for (const techCardData of roomData.directTechCards || []) {
            const techCard = await prisma.techCard.create({
              data: {
                name: techCardData.name,
                workType: 'Уборка',
                frequency: techCardData.frequency || 'По требованию',
                description: techCardData.name,
                notes: techCardData.notes,
                period: techCardData.period,
                objectId: cleaningObject.id,
                roomId: room.id
              }
            });
            totalTechCards++;
          }
        }
        
        // Прямые техкарты к участку
        for (const techCardData of siteData.directTechCards || []) {
          const techCard = await prisma.techCard.create({
            data: {
              name: techCardData.name,
              workType: 'Уборка',
              frequency: techCardData.frequency || 'По требованию',
              description: techCardData.name,
              notes: techCardData.notes,
              period: techCardData.period,
              objectId: cleaningObject.id
            }
          });
          totalTechCards++;
        }
      }
      
      // Прямые помещения в объекте
      for (const [roomName, roomData] of Object.entries(objectData.directRooms || {})) {
        console.log(`    🏠 Создаем помещение в объекте: ${roomName}`);
        
        const room = await prisma.room.create({
          data: {
            name: roomName,
            objectId: cleaningObject.id
          }
        });
        totalRooms++;
        
        // Создаем объекты уборки
        for (const [cleaningObjectName, cleaningObjectData] of Object.entries(roomData.cleaningObjects || {})) {
          console.log(`      🧹 Создаем объект уборки: ${cleaningObjectName}`);
          
          const cleaningObjectItem = await prisma.cleaningObjectItem.create({
            data: {
              name: cleaningObjectName,
              roomId: room.id
            }
          });
          totalCleaningObjects++;
          
          // Создаем техкарты
          for (const techCardData of cleaningObjectData.techCards || []) {
            const techCard = await prisma.techCard.create({
              data: {
                name: techCardData.name,
                workType: 'Уборка',
                frequency: techCardData.frequency || 'По требованию',
                description: techCardData.name,
                notes: techCardData.notes,
                period: techCardData.period,
                objectId: cleaningObject.id,
                roomId: room.id,
                cleaningObjectItemId: cleaningObjectItem.id
              }
            });
            totalTechCards++;
          }
        }
        
        // Прямые техкарты к помещению
        for (const techCardData of roomData.directTechCards || []) {
          const techCard = await prisma.techCard.create({
            data: {
              name: techCardData.name,
              workType: 'Уборка',
              frequency: techCardData.frequency || 'По требованию',
              description: techCardData.name,
              notes: techCardData.notes,
              period: techCardData.period,
              objectId: cleaningObject.id,
              roomId: room.id
            }
          });
          totalTechCards++;
        }
      }
      
      // Прямые техкарты к объекту
      for (const techCardData of objectData.directTechCards || []) {
        const techCard = await prisma.techCard.create({
          data: {
            name: techCardData.name,
            workType: 'Уборка',
            frequency: techCardData.frequency || 'По требованию',
            description: techCardData.name,
            notes: techCardData.notes,
            period: techCardData.period,
            objectId: cleaningObject.id
          }
        });
        totalTechCards++;
      }
    }
    
    console.log('\n🎉 ИМПОРТ ЗАВЕРШЕН УСПЕШНО!');
    console.log('📊 СТАТИСТИКА:');
    console.log(`  🏢 Объектов: ${totalObjects}`);
    console.log(`  📍 Участков: ${totalSites}`);
    console.log(`  🏗️ Зон: ${totalZones}`);
    console.log(`  📦 Групп помещений: ${totalRoomGroups}`);
    console.log(`  🏠 Помещений: ${totalRooms}`);
    console.log(`  🧹 Объектов уборки: ${totalCleaningObjects}`);
    console.log(`  📋 Техкарт: ${totalTechCards}`);
    
  } catch (error) {
    console.error('❌ Ошибка при импорте:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем импорт
importData();
