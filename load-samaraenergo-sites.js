const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadSamaraenergoSites() {
  try {
    console.log('🏢 ЗАГРУЗКА УЧАСТКОВ САМАРАЭНЕРГО');
    console.log('=================================\n');

    // Читаем файл и фильтруем строки для Самараэнерго
    const fileContent = fs.readFileSync('context_1.md', 'utf-8');
    const lines = fileContent.split('\n');
    
    const samaraenergoLines = lines.filter(line => 
      line.includes('Самараэнерго') && 
      line.trim().length > 0 &&
      !line.includes('ЗАГРУЗКА ОБЪЕКТА') &&
      !line.includes('===')
    );
    
    console.log(`📋 Найдено строк для Самараэнерго: ${samaraenergoLines.length}\n`);

    // Создаем или находим объект Самараэнерго
    console.log('🏗️ ПОИСК/СОЗДАНИЕ ОБЪЕКТА:');
    let cleaningObject = await prisma.cleaningObject.findFirst({
      where: { name: { contains: 'Самараэнерго', mode: 'insensitive' } }
    });

    if (!cleaningObject) {
      // Находим админа для создания объекта
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!admin) {
        throw new Error('Не найден администратор для создания объекта');
      }

      cleaningObject = await prisma.cleaningObject.create({
        data: {
          name: 'АО "Самараэнерго"',
          address: 'г. Самара, ул. Молодогвардейская, 194',
          creatorId: admin.id,
          timezone: 'Europe/Samara',
          workingHours: JSON.stringify({ start: '08:00', end: '18:00' }),
          workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          autoChecklistEnabled: true
        }
      });

      console.log(`✅ Создан объект: ${cleaningObject.name}`);
    } else {
      console.log(`✅ Найден объект: ${cleaningObject.name}`);
    }

    // Находим менеджера для назначения на участки
    const manager = await prisma.user.findFirst({
      where: { 
        name: { contains: 'Гайнуллина', mode: 'insensitive' },
        role: 'MANAGER'
      }
    });

    console.log(`👤 Менеджер для участков: ${manager?.name || 'не найден'}\n`);

    // Анализируем данные и создаем участки
    console.log('🔍 АНАЛИЗ И СОЗДАНИЕ УЧАСТКОВ:');
    console.log('=' .repeat(50));

    const sitesData = [];
    const processedSites = new Set();

    for (const line of samaraenergoLines) {
      const parts = line.split('\t').map(p => p.trim()).filter(p => p);
      
      // Ищем информацию об участках/зданиях в строке
      for (const part of parts) {
        // Пропускаем общие термины
        if (part.includes('Самараэнерго') || 
            part.includes('уборка') || 
            part.includes('клининг') ||
            part.length < 3) {
          continue;
        }

        // Ищем потенциальные названия участков
        if (part.match(/^[А-Я][а-я\s\-\d]+/) && 
            !processedSites.has(part.toLowerCase())) {
          
          // Определяем тип участка
          let siteType = 'Общий участок';
          let area = null;
          
          if (part.toLowerCase().includes('здание') || 
              part.toLowerCase().includes('корпус')) {
            siteType = 'Здание';
          } else if (part.toLowerCase().includes('офис')) {
            siteType = 'Офисное помещение';
          } else if (part.toLowerCase().includes('склад')) {
            siteType = 'Складское помещение';
          } else if (part.toLowerCase().includes('территория')) {
            siteType = 'Территория';
          }

          // Пытаемся извлечь площадь из строки
          const areaMatch = line.match(/(\d+(?:\.\d+)?)\s*м²/);
          if (areaMatch) {
            area = parseFloat(areaMatch[1]);
          }

          sitesData.push({
            name: part,
            description: `${siteType} объекта Самараэнерго`,
            area: area,
            objectId: cleaningObject.id,
            managerId: manager?.id
          });

          processedSites.add(part.toLowerCase());
        }
      }
    }

    // Если не удалось извлечь участки из данных, создаем стандартные
    if (sitesData.length === 0) {
      console.log('⚠️  Не удалось извлечь участки из данных, создаем стандартные участки');
      
      sitesData.push(
        {
          name: 'Административное здание',
          description: 'Главное административное здание Самараэнерго',
          area: 2500.0,
          objectId: cleaningObject.id,
          managerId: manager?.id
        },
        {
          name: 'Производственный корпус',
          description: 'Производственные помещения и цеха',
          area: 4000.0,
          objectId: cleaningObject.id,
          managerId: manager?.id
        },
        {
          name: 'Офисный блок',
          description: 'Офисные помещения сотрудников',
          area: 1200.0,
          objectId: cleaningObject.id,
          managerId: manager?.id
        },
        {
          name: 'Складские помещения',
          description: 'Складские и подсобные помещения',
          area: 800.0,
          objectId: cleaningObject.id,
          managerId: manager?.id
        },
        {
          name: 'Прилегающая территория',
          description: 'Территория вокруг зданий',
          area: 1500.0,
          objectId: cleaningObject.id,
          managerId: manager?.id
        }
      );
    }

    console.log(`📋 Подготовлено участков для создания: ${sitesData.length}\n`);

    // Создаем участки
    let createdCount = 0;
    let skippedCount = 0;

    for (const siteData of sitesData) {
      try {
        // Проверяем, не существует ли уже такой участок
        const existingSite = await prisma.site.findFirst({
          where: {
            name: siteData.name,
            objectId: cleaningObject.id
          }
        });

        if (existingSite) {
          console.log(`⏭️  Пропущен (уже существует): ${siteData.name}`);
          skippedCount++;
          continue;
        }

        const site = await prisma.site.create({
          data: siteData
        });

        console.log(`✅ Создан участок: ${site.name}`);
        if (site.area) {
          console.log(`   📐 Площадь: ${site.area} м²`);
        }
        if (manager) {
          console.log(`   👤 Менеджер: ${manager.name}`);
        }
        console.log(`   📝 Описание: ${site.description}`);

        // Логируем в аудит
        await prisma.auditLog.create({
          data: {
            userId: 'system',
            action: 'CREATE_SITE',
            entity: 'SITE',
            entityId: site.id,
            details: `Автоматически создан участок: ${site.name} для объекта ${cleaningObject.name}`
          }
        });

        createdCount++;
        console.log('');

      } catch (error) {
        console.log(`❌ Ошибка создания участка ${siteData.name}: ${error.message}`);
      }
    }

    // Итоговая статистика
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('=' .repeat(30));
    console.log(`✅ Создано участков: ${createdCount}`);
    console.log(`⏭️  Пропущено (уже существуют): ${skippedCount}`);
    console.log(`🏢 Объект: ${cleaningObject.name}`);
    console.log(`👤 Назначенный менеджер: ${manager?.name || 'не назначен'}`);

    // Показываем все участки объекта
    const allSites = await prisma.site.findMany({
      where: { objectId: cleaningObject.id },
      include: {
        manager: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n🗺️  ВСЕГО УЧАСТКОВ ОБЪЕКТА: ${allSites.length}`);
    allSites.forEach((site, index) => {
      console.log(`${index + 1}. ${site.name}`);
      if (site.area) console.log(`   📐 ${site.area} м²`);
      if (site.manager) console.log(`   👤 ${site.manager.name}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

loadSamaraenergoSites();
