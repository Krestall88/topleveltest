const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createAllObjectsFromContext() {
  try {
    console.log('🏗️ СОЗДАНИЕ ВСЕХ ОБЪЕКТОВ ИЗ CONTEXT_1.MD');
    console.log('='.repeat(60));

    // Читаем файл context_1.md
    const contextPath = path.join(__dirname, 'context_1.md');
    if (!fs.existsSync(contextPath)) {
      console.error('❌ Файл context_1.md не найден!');
      return;
    }

    const content = fs.readFileSync(contextPath, 'utf-8');
    const lines = content.split('\n');

    // Парсим данные
    const objectsData = new Map();
    let currentObject = null;

    for (let i = 1; i < lines.length; i++) { // Пропускаем заголовок
      const line = lines[i].trim();
      if (!line) continue;

      const columns = line.split('\t');
      if (columns.length < 11) continue;

      const [
        objectName,
        address,
        site,
        zone,
        roomGroup,
        room,
        cleaningObject,
        techTask,
        frequency,
        notes,
        period
      ] = columns;

      if (!objectName || objectName === 'наименование объекта') continue;

      // Создаем или получаем объект
      if (!objectsData.has(objectName)) {
        objectsData.set(objectName, {
          name: objectName,
          address: address || 'Адрес не указан',
          sites: new Map(),
          directRooms: new Map(),
          directTechCards: []
        });
      }

      const obj = objectsData.get(objectName);

      // Если есть техзадание без структуры - это прямое техзадание объекта
      if (techTask && !site && !zone && !roomGroup && !room && !cleaningObject) {
        obj.directTechCards.push({
          name: techTask,
          workType: 'Общие работы',
          frequency: frequency || 'По необходимости',
          description: techTask,
          notes: notes || '',
          period: period || ''
        });
        continue;
      }

      // Обрабатываем структуру: участок -> зона -> группа -> помещение -> объект уборки -> техзадание
      if (site) {
        if (!obj.sites.has(site)) {
          obj.sites.set(site, {
            name: site,
            zones: new Map()
          });
        }

        const siteObj = obj.sites.get(site);

        if (zone) {
          if (!siteObj.zones.has(zone)) {
            siteObj.zones.set(zone, {
              name: zone,
              roomGroups: new Map()
            });
          }

          const zoneObj = siteObj.zones.get(zone);

          if (roomGroup) {
            if (!zoneObj.roomGroups.has(roomGroup)) {
              zoneObj.roomGroups.set(roomGroup, {
                name: roomGroup,
                rooms: new Map()
              });
            }

            const roomGroupObj = zoneObj.roomGroups.get(roomGroup);

            if (room) {
              if (!roomGroupObj.rooms.has(room)) {
                roomGroupObj.rooms.set(room, {
                  name: room,
                  cleaningObjects: new Map(),
                  techCards: []
                });
              }

              const roomObj = roomGroupObj.rooms.get(room);

              if (cleaningObject && techTask) {
                if (!roomObj.cleaningObjects.has(cleaningObject)) {
                  roomObj.cleaningObjects.set(cleaningObject, {
                    name: cleaningObject,
                    techCards: []
                  });
                }

                roomObj.cleaningObjects.get(cleaningObject).techCards.push({
                  name: techTask,
                  workType: 'Специализированная уборка',
                  frequency: frequency || 'По необходимости',
                  description: techTask,
                  notes: notes || '',
                  period: period || ''
                });
              } else if (techTask) {
                roomObj.techCards.push({
                  name: techTask,
                  workType: 'Уборка помещения',
                  frequency: frequency || 'По необходимости',
                  description: techTask,
                  notes: notes || '',
                  period: period || ''
                });
              }
            }
          }
        }
      } else if (room) {
        // Прямое помещение объекта
        if (!obj.directRooms.has(room)) {
          obj.directRooms.set(room, {
            name: room,
            cleaningObjects: new Map(),
            techCards: []
          });
        }

        const roomObj = obj.directRooms.get(room);

        if (cleaningObject && techTask) {
          if (!roomObj.cleaningObjects.has(cleaningObject)) {
            roomObj.cleaningObjects.set(cleaningObject, {
              name: cleaningObject,
              techCards: []
            });
          }

          roomObj.cleaningObjects.get(cleaningObject).techCards.push({
            name: techTask,
            workType: 'Специализированная уборка',
            frequency: frequency || 'По необходимости',
            description: techTask,
            notes: notes || '',
            period: period || ''
          });
        } else if (techTask) {
          roomObj.techCards.push({
            name: techTask,
            workType: 'Уборка помещения',
            frequency: frequency || 'По необходимости',
            description: techTask,
            notes: notes || '',
            period: period || ''
          });
        }
      }
    }

    console.log(`📊 Найдено объектов: ${objectsData.size}`);

    // Создаем объекты в базе данных
    let createdCount = 0;
    let updatedCount = 0;

    for (const [objectName, objectData] of objectsData) {
      console.log(`\n🏢 Обрабатываем: ${objectName}`);

      // Проверяем, существует ли объект
      let dbObject = await prisma.cleaningObject.findFirst({
        where: { name: objectName }
      });

      if (!dbObject) {
        // Создаем новый объект
        dbObject = await prisma.cleaningObject.create({
          data: {
            name: objectData.name,
            address: objectData.address,
            creatorId: 'cmga0qv530000vyzw7j2vmszs' // ID админа
          }
        });
        createdCount++;
        console.log(`   ✅ Создан объект`);
      } else {
        updatedCount++;
        console.log(`   📝 Объект уже существует, обновляем данные`);
      }

      // Создаем прямые техкарты объекта
      for (const techCard of objectData.directTechCards) {
        await prisma.techCard.create({
          data: {
            name: techCard.name,
            workType: techCard.workType,
            frequency: techCard.frequency,
            description: techCard.description,
            notes: techCard.notes,
            period: techCard.period,
            objectId: dbObject.id
          }
        });
      }
      console.log(`   📋 Создано прямых техкарт: ${objectData.directTechCards.length}`);

      // Создаем участки
      for (const [siteName, siteData] of objectData.sites) {
        const dbSite = await prisma.site.create({
          data: {
            name: siteName,
            objectId: dbObject.id
          }
        });

        // Создаем зоны
        for (const [zoneName, zoneData] of siteData.zones) {
          const dbZone = await prisma.zone.create({
            data: {
              name: zoneName,
              siteId: dbSite.id
            }
          });

          // Создаем группы помещений
          for (const [roomGroupName, roomGroupData] of zoneData.roomGroups) {
            const dbRoomGroup = await prisma.roomGroup.create({
              data: {
                name: roomGroupName,
                zoneId: dbZone.id
              }
            });

            // Создаем помещения в группе
            for (const [roomName, roomData] of roomGroupData.rooms) {
              const dbRoom = await prisma.room.create({
                data: {
                  name: roomName,
                  objectId: dbObject.id,
                  roomGroupId: dbRoomGroup.id
                }
              });

              // Создаем техкарты помещения
              for (const techCard of roomData.techCards) {
                await prisma.techCard.create({
                  data: {
                    name: techCard.name,
                    workType: techCard.workType,
                    frequency: techCard.frequency,
                    description: techCard.description,
                    notes: techCard.notes,
                    period: techCard.period,
                    objectId: dbObject.id,
                    roomId: dbRoom.id
                  }
                });
              }

              // Создаем объекты уборки
              for (const [cleaningObjectName, cleaningObjectData] of roomData.cleaningObjects) {
                const dbCleaningObject = await prisma.cleaningObjectItem.create({
                  data: {
                    name: cleaningObjectName,
                    roomId: dbRoom.id
                  }
                });

                // Создаем техкарты объекта уборки
                for (const techCard of cleaningObjectData.techCards) {
                  await prisma.techCard.create({
                    data: {
                      name: techCard.name,
                      workType: techCard.workType,
                      frequency: techCard.frequency,
                      description: techCard.description,
                      notes: techCard.notes,
                      period: techCard.period,
                      objectId: dbObject.id,
                      roomId: dbRoom.id,
                      cleaningObjectItemId: dbCleaningObject.id
                    }
                  });
                }
              }
            }
          }
        }
      }

      // Создаем прямые помещения объекта
      for (const [roomName, roomData] of objectData.directRooms) {
        const dbRoom = await prisma.room.create({
          data: {
            name: roomName,
            objectId: dbObject.id
          }
        });

        // Создаем техкарты помещения
        for (const techCard of roomData.techCards) {
          await prisma.techCard.create({
            data: {
              name: techCard.name,
              workType: techCard.workType,
              frequency: techCard.frequency,
              description: techCard.description,
              notes: techCard.notes,
              period: techCard.period,
              objectId: dbObject.id,
              roomId: dbRoom.id
            }
          });
        }

        // Создаем объекты уборки
        for (const [cleaningObjectName, cleaningObjectData] of roomData.cleaningObjects) {
          const dbCleaningObject = await prisma.cleaningObjectItem.create({
            data: {
              name: cleaningObjectName,
              roomId: dbRoom.id
            }
          });

          // Создаем техкарты объекта уборки
          for (const techCard of cleaningObjectData.techCards) {
            await prisma.techCard.create({
              data: {
                name: techCard.name,
                workType: techCard.workType,
                frequency: techCard.frequency,
                description: techCard.description,
                notes: techCard.notes,
                period: techCard.period,
                objectId: dbObject.id,
                roomId: dbRoom.id,
                cleaningObjectItemId: dbCleaningObject.id
              }
            });
          }
        }
      }

      console.log(`   🏗️ Участков: ${objectData.sites.size}`);
      console.log(`   🏠 Прямых помещений: ${objectData.directRooms.size}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 СОЗДАНИЕ ОБЪЕКТОВ ЗАВЕРШЕНО!');
    console.log(`📊 Создано новых объектов: ${createdCount}`);
    console.log(`📝 Обновлено существующих: ${updatedCount}`);
    console.log(`📋 Всего объектов обработано: ${objectsData.size}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAllObjectsFromContext();
