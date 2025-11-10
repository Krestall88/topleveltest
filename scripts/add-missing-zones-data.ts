import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingZonesData() {
  console.log('🔧 ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ДАННЫХ В ЗОНЫ\n');
  
  // Ищем объект "АО «ГК «Электрощит» -ТМ Самара»"
  const object = await prisma.cleaningObject.findFirst({
    where: {
      name: {
        contains: 'ГК «Электрощит»',
        mode: 'insensitive'
      }
    },
    include: {
      sites: {
        include: {
          zones: {
            include: {
              roomGroups: {
                include: {
                  rooms: true
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (!object) {
    console.log('❌ Объект не найден\n');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Найден объект: ${object.name}\n`);
  
  // Данные для добавления
  const zonesData = [
    {
      zoneName: '1 этаж (центральный вход в ФСК)',
      rooms: [
        { name: 'Холл', cleaningObject: 'Окна с 2х сторон', techTask: 'Влажная уборка до 1.7м', frequency: '1 раз в 6 месяцев', notes: null },
        { name: 'Кабинет/вахта', cleaningObject: 'Окна с 2х сторон', techTask: 'Мойка до 1.7м', frequency: '1 раз в 6 месяцев', notes: null },
        { name: 'Борцовский зал', cleaningObject: 'Окна с двух сторон', techTask: 'влажная уборка по мере доступа', frequency: '1 раз в год', notes: null },
        { name: 'Раздевалки', cleaningObject: 'Стены', techTask: 'влажная уборка локально', frequency: '1 раз в месяц', notes: null },
        { name: 'Душевые', cleaningObject: 'стены', techTask: 'влажная уборка', frequency: '1 раз в неделю', notes: null },
        { name: 'Кабинет №1', cleaningObject: 'полы, двери, подоконники', techTask: 'влажная уборка', frequency: '1 раз в неделю', notes: null },
        { name: 'Борцовский зал', cleaningObject: 'полы, стены, дверь', techTask: 'влажная уборка', frequency: '1 раз в неделю', notes: null },
        { name: 'Борцовский зал', cleaningObject: 'стены, дверь', techTask: 'влажная уборка (если позволяет характер загрязнения)', frequency: '1 раз в неделю', notes: null },
        { name: 'Борцовский зал', cleaningObject: 'маты', techTask: 'Протирка с дез. средством', frequency: '1 раз в неделю', notes: null },
        { name: 'подсобка', cleaningObject: 'полы', techTask: 'влажная уборка', frequency: '1 раз в неделю', notes: null },
        { name: 'Кабинет/вахта', cleaningObject: 'Подоконники', techTask: 'Влажная уборка', frequency: '1 раз в неделю', notes: 'Дневная уборка 8.00-17.00 час' },
        { name: 'Раздевалки', cleaningObject: 'скамейки', techTask: 'Влажная уборка', frequency: '1 раз в неделю', notes: 'по мере загрязнения' },
        { name: 'Мужской туалет  (4 кабинки)', cleaningObject: 'двери', techTask: 'Влажная уборка', frequency: '1 раз в неделю', notes: 'По мере загрязнения. Но не реже 1 раз  в неделю' },
        { name: 'Холл', cleaningObject: 'Полы, двери, зеркала, вынос мусора', techTask: 'Влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
        { name: 'Кабинет/вахта', cleaningObject: 'Полы, дверь, раковина', techTask: 'Влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
        { name: 'Раздевалки', cleaningObject: 'полы, двери', techTask: 'влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
        { name: 'Женский туалет (2 кабинки)', cleaningObject: 'сантехника,  полы', techTask: 'влажная уборка с дезинфекцией', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
        { name: 'Душевые', cleaningObject: 'полы', techTask: 'влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
        { name: 'Коридор', cleaningObject: 'полы, двери', techTask: 'влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
      ]
    },
    {
      zoneName: '3 этаж',
      rooms: [
        { name: 'Зал хореографии', cleaningObject: 'Окна с 2х сторон', techTask: 'Влажная уборка по мере доступа', frequency: '1 раз в 6 месяцев', notes: null },
        { name: 'Зал хореографии', cleaningObject: 'двери', techTask: 'влажная уборка', frequency: '1 раз в месяц', notes: null },
        { name: 'Площадка для зрителей', cleaningObject: 'полы, поручни', techTask: 'Влажная уборка', frequency: '1 раз в месяц', notes: 'дневная уборка' },
        { name: 'Зал хореографии', cleaningObject: 'Подоконники', techTask: 'Влажная уборка', frequency: '1 раз в неделю', notes: 'Дневная уборка 8.00-17.00 час' },
        { name: 'Зал хореографии', cleaningObject: 'полы', techTask: 'влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
      ]
    },
    {
      zoneName: '2 этаж',
      rooms: [
        { name: 'Большой игровой зал', cleaningObject: 'радиаторы', techTask: 'влажная уборка', frequency: '1 раз в месяц', notes: 'дневная уборка' },
        { name: 'Лестничный марш', cleaningObject: 'Напольное покрытие', techTask: 'влажная уборка', frequency: '1 раз в неделю', notes: 'Дневная уборка 8.00-17.00 час' },
        { name: 'Большой игровой зал', cleaningObject: 'полы, двери', techTask: 'влажная уборка', frequency: 'ежедневно', notes: '1 раз в день дневная уборка' },
      ]
    }
  ];
  
  console.log('🔍 Поиск зон...\n');
  
  // Ищем участок "спортивный комплекс «Энергия»"
  const sportSite = object.sites.find(s => s.name.includes('спортивный комплекс'));
  
  if (!sportSite) {
    console.log(`❌ Участок "спортивный комплекс" не найден\n`);
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Найден участок: ${sportSite.name}\n`);
  
  for (const zoneData of zonesData) {
    // Ищем зону в спортивном комплексе
    const zone = sportSite.zones.find(z => z.name === zoneData.zoneName);
    
    if (!zone) {
      console.log(`❌ Зона "${zoneData.zoneName}" не найдена\n`);
      continue;
    }
    
    console.log(`✅ Найдена зона: ${zone.name}`);
    console.log(`   Текущих групп: ${zone.roomGroups.length}\n`);
    
    // Создаем виртуальную группу для зоны
    const virtualGroup = await prisma.roomGroup.create({
      data: {
        name: '__VIRTUAL__',
        zoneId: zone.id,
        description: 'Виртуальная группа - не показывать в UI'
      }
    });
    
    console.log(`   🔹 Создана виртуальная группа\n`);
    
    // Добавляем помещения и техкарты
    for (const roomData of zoneData.rooms) {
      // Создаем помещение
      const room = await prisma.room.create({
        data: {
          name: roomData.name,
          objectId: object.id,
          roomGroupId: virtualGroup.id
        }
      });
      
      console.log(`      ✅ Создано помещение: ${room.name}`);
      
      // Создаем объект уборки
      const cleaningItem = await prisma.cleaningObjectItem.create({
        data: {
          name: roomData.cleaningObject,
          roomId: room.id
        }
      });
      
      console.log(`         📋 Создан объект уборки: ${cleaningItem.name}`);
      
      // Создаем техкарту
      const techCard = await prisma.techCard.create({
        data: {
          name: roomData.techTask,
          workType: 'Уборка',
          frequency: roomData.frequency,
          notes: roomData.notes,
          objectId: object.id,
          roomId: room.id,
          cleaningObjectItemId: cleaningItem.id
        }
      });
      
      console.log(`            🔧 Создана техкарта: ${techCard.name}\n`);
    }
  }
  
  console.log('='.repeat(70));
  console.log('✅ ДАННЫЕ ДОБАВЛЕНЫ!');
  console.log('='.repeat(70));
  
  await prisma.$disconnect();
}

addMissingZonesData().catch(console.error);
