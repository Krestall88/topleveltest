const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createFinalObjects() {
  try {
    console.log('🏗️ ФИНАЛЬНОЕ СОЗДАНИЕ ВСЕХ ОБЪЕКТОВ ИЗ CONTEXT_1.MD');
    console.log('='.repeat(80));

    // Читаем список реальных объектов
    const realObjectsPath = path.join(__dirname, 'real-objects-list.json');
    if (!fs.existsSync(realObjectsPath)) {
      console.error('❌ Файл real-objects-list.json не найден! Запустите сначала find-all-real-objects.js');
      return;
    }

    const realObjectsList = JSON.parse(fs.readFileSync(realObjectsPath, 'utf-8'));
    console.log(`📋 Загружен список из ${realObjectsList.length} реальных объектов\n`);

    // Читаем файл context_1.md
    const contextPath = path.join(__dirname, 'context_1.md');
    const content = fs.readFileSync(contextPath, 'utf-8');
    const lines = content.split('\n');

    // Создаем карту реальных объектов
    const realObjectNames = new Set(realObjectsList.map(obj => obj.name));

    // Парсим данные только для реальных объектов
    const objectsData = new Map();

    for (let i = 1; i < lines.length; i++) {
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

      // Проверяем, является ли объект реальным
      if (!realObjectNames.has(objectName)) continue;

      // Создаем или получаем объект
      if (!objectsData.has(objectName)) {
        const realObjectInfo = realObjectsList.find(obj => obj.name === objectName);
        objectsData.set(objectName, {
          name: objectName,
          address: realObjectInfo.address,
          sites: new Map(),
          directRooms: new Map(),
          directTechCards: []
        });
      }

      const obj = objectsData.get(objectName);

      // Если есть техзадание без структуры - это прямое техзадание объекта
      if (techTask && techTask.trim() && (!site || !site.trim()) && (!zone || !zone.trim()) && (!roomGroup || !roomGroup.trim()) && (!room || !room.trim()) && (!cleaningObject || !cleaningObject.trim())) {
        obj.directTechCards.push({
          name: techTask.trim(),
          workType: 'Общие работы',
          frequency: frequency && frequency.trim() ? frequency.trim() : 'По необходимости',
          description: techTask.trim(),
          notes: notes && notes.trim() ? notes.trim() : '',
          period: period && period.trim() ? period.trim() : ''
        });
        continue;
      }

      // Обрабатываем структуру: участок -> зона -> группа -> помещение -> объект уборки -> техзадание
      if (site && site.trim()) {
        if (!obj.sites.has(site)) {
          obj.sites.set(site, {
            name: site.trim(),
            zones: new Map()
          });
        }

        const siteObj = obj.sites.get(site);

        if (zone && zone.trim()) {
          if (!siteObj.zones.has(zone)) {
            siteObj.zones.set(zone, {
              name: zone.trim(),
              roomGroups: new Map()
            });
          }

          const zoneObj = siteObj.zones.get(zone);

          if (roomGroup && roomGroup.trim()) {
            if (!zoneObj.roomGroups.has(roomGroup)) {
              zoneObj.roomGroups.set(roomGroup, {
                name: roomGroup.trim(),
                rooms: new Map()
              });
            }

            const roomGroupObj = zoneObj.roomGroups.get(roomGroup);

            if (room && room.trim()) {
              if (!roomGroupObj.rooms.has(room)) {
                roomGroupObj.rooms.set(room, {
                  name: room.trim(),
                  cleaningObjects: new Map(),
                  techCards: []
                });
              }

              const roomObj = roomGroupObj.rooms.get(room);

              if (cleaningObject && cleaningObject.trim() && techTask && techTask.trim()) {
                if (!roomObj.cleaningObjects.has(cleaningObject)) {
                  roomObj.cleaningObjects.set(cleaningObject, {
                    name: cleaningObject.trim(),
                    techCards: []
                  });
                }

                roomObj.cleaningObjects.get(cleaningObject).techCards.push({
                  name: techTask.trim(),
                  workType: 'Специализированная уборка',
                  frequency: frequency && frequency.trim() ? frequency.trim() : 'По необходимости',
                  description: techTask.trim(),
                  notes: notes && notes.trim() ? notes.trim() : '',
                  period: period && period.trim() ? period.trim() : ''
                });
              } else if (techTask && techTask.trim()) {
                roomObj.techCards.push({
                  name: techTask.trim(),
                  workType: 'Уборка помещения',
                  frequency: frequency && frequency.trim() ? frequency.trim() : 'По необходимости',
                  description: techTask.trim(),
                  notes: notes && notes.trim() ? notes.trim() : '',
                  period: period && period.trim() ? period.trim() : ''
                });
              }
            }
          }
        }
      } else if (room && room.trim()) {
        // Прямое помещение объекта
        if (!obj.directRooms.has(room)) {
          obj.directRooms.set(room, {
            name: room.trim(),
            cleaningObjects: new Map(),
            techCards: []
          });
        }

        const roomObj = obj.directRooms.get(room);

        if (cleaningObject && cleaningObject.trim() && techTask && techTask.trim()) {
          if (!roomObj.cleaningObjects.has(cleaningObject)) {
            roomObj.cleaningObjects.set(cleaningObject, {
              name: cleaningObject.trim(),
              techCards: []
            });
          }

          roomObj.cleaningObjects.get(cleaningObject).techCards.push({
            name: techTask.trim(),
            workType: 'Специализированная уборка',
            frequency: frequency && frequency.trim() ? frequency.trim() : 'По необходимости',
            description: techTask.trim(),
            notes: notes && notes.trim() ? notes.trim() : '',
            period: period && period.trim() ? period.trim() : ''
          });
        } else if (techTask && techTask.trim()) {
          roomObj.techCards.push({
            name: techTask.trim(),
            workType: 'Уборка помещения',
            frequency: frequency && frequency.trim() ? frequency.trim() : 'По необходимости',
            description: techTask.trim(),
            notes: notes && notes.trim() ? notes.trim() : '',
            period: period && period.trim() ? period.trim() : ''
          });
        }
      }
    }

    console.log(`🏢 Объектов для создания: ${objectsData.size}\n`);

    // Создаем объекты в базе данных
    let createdCount = 0;
    let updatedCount = 0;
    let totalTechCards = 0;
    let totalRooms = 0;
    let totalSites = 0;
    let totalZones = 0;
    let totalRoomGroups = 0;
    let totalCleaningObjects = 0;

    for (const [objectName, objectData] of objectsData) {
      console.log(`\n🏢 Обрабатываем: ${objectName}`);
      console.log(`   📍 Адрес: ${objectData.address}`);

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
        totalTechCards++;
      }

      // Создаем участки
      for (const [siteName, siteData] of objectData.sites) {
        const dbSite = await prisma.site.create({
          data: {
            name: siteName,
            objectId: dbObject.id
          }
        });
        totalSites++;

        // Создаем зоны
        for (const [zoneName, zoneData] of siteData.zones) {
          const dbZone = await prisma.zone.create({
            data: {
              name: zoneName,
              siteId: dbSite.id
            }
          });
          totalZones++;

          // Создаем группы помещений
          for (const [roomGroupName, roomGroupData] of zoneData.roomGroups) {
            const dbRoomGroup = await prisma.roomGroup.create({
              data: {
                name: roomGroupName,
                zoneId: dbZone.id
              }
            });
            totalRoomGroups++;

            // Создаем помещения в группе
            for (const [roomName, roomData] of roomGroupData.rooms) {
              const dbRoom = await prisma.room.create({
                data: {
                  name: roomName,
                  objectId: dbObject.id,
                  roomGroupId: dbRoomGroup.id
                }
              });
              totalRooms++;

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
                totalTechCards++;
              }

              // Создаем объекты уборки
              for (const [cleaningObjectName, cleaningObjectData] of roomData.cleaningObjects) {
                const dbCleaningObject = await prisma.cleaningObjectItem.create({
                  data: {
                    name: cleaningObjectName,
                    roomId: dbRoom.id
                  }
                });
                totalCleaningObjects++;

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
                  totalTechCards++;
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
        totalRooms++;

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
          totalTechCards++;
        }

        // Создаем объекты уборки
        for (const [cleaningObjectName, cleaningObjectData] of roomData.cleaningObjects) {
          const dbCleaningObject = await prisma.cleaningObjectItem.create({
            data: {
              name: cleaningObjectName,
              roomId: dbRoom.id
            }
          });
          totalCleaningObjects++;

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
            totalTechCards++;
          }
        }
      }

      console.log(`   📋 Прямых техкарт: ${objectData.directTechCards.length}`);
      console.log(`   🏗️ Участков: ${objectData.sites.size}`);
      console.log(`   🏠 Прямых помещений: ${objectData.directRooms.size}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 ФИНАЛЬНОЕ СОЗДАНИЕ ОБЪЕКТОВ ЗАВЕРШЕНО!');
    console.log(`📊 Создано новых объектов: ${createdCount}`);
    console.log(`📝 Обновлено существующих: ${updatedCount}`);
    console.log(`🏢 Всего объектов обработано: ${objectsData.size}`);
    console.log(`🏗️ Всего участков создано: ${totalSites}`);
    console.log(`🏭 Всего зон создано: ${totalZones}`);
    console.log(`👥 Всего групп помещений создано: ${totalRoomGroups}`);
    console.log(`🏠 Всего помещений создано: ${totalRooms}`);
    console.log(`📦 Всего объектов уборки создано: ${totalCleaningObjects}`);
    console.log(`📋 Всего техкарт создано: ${totalTechCards}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFinalObjects();
