const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSamaraenergoSites() {
  try {
    console.log('🏢 СОЗДАНИЕ УЧАСТКОВ САМАРАЭНЕРГО');
    console.log('=================================\n');

    // Находим объект Самараэнерго
    const cleaningObject = await prisma.cleaningObject.findFirst({
      where: { 
        OR: [
          { name: { contains: 'Самараэнерго', mode: 'insensitive' } },
          { name: { contains: 'Самара', mode: 'insensitive' } }
        ]
      }
    });

    if (!cleaningObject) {
      throw new Error('Объект Самараэнерго не найден');
    }

    console.log(`✅ Найден объект: ${cleaningObject.name}`);

    // Находим менеджера Гайнуллину
    const manager = await prisma.user.findFirst({
      where: { 
        name: { contains: 'Гайнуллина', mode: 'insensitive' },
        role: 'MANAGER'
      }
    });

    console.log(`👤 Менеджер: ${manager?.name || 'не найден'}\n`);

    // Находим админа для логирования
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    // Удаляем существующий некорректный участок
    await prisma.site.deleteMany({
      where: {
        objectId: cleaningObject.id,
        name: 'Ежедневно'
      }
    });

    console.log('🗑️  Удален некорректный участок "Ежедневно"\n');

    // Создаем правильные участки для энергетической компании
    const sitesData = [
      {
        name: 'Административное здание',
        description: 'Главное административное здание с офисами руководства, бухгалтерией и приемной',
        area: 1200.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      },
      {
        name: 'Диспетчерский центр',
        description: 'Центр управления энергосетями с серверным оборудованием и операторскими',
        area: 300.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      },
      {
        name: 'Производственные помещения',
        description: 'Цеха, мастерские и технические помещения для обслуживания оборудования',
        area: 800.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      },
      {
        name: 'Складские помещения',
        description: 'Склады запчастей, материалов и оборудования',
        area: 400.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      },
      {
        name: 'Офисные помещения',
        description: 'Рабочие места инженеров, техников и административного персонала',
        area: 600.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      },
      {
        name: 'Подстанция',
        description: 'Помещения электрической подстанции и распределительных устройств',
        area: 200.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      },
      {
        name: 'Прилегающая территория',
        description: 'Территория вокруг зданий, парковка, подъездные пути',
        area: 1500.0,
        objectId: cleaningObject.id,
        managerId: manager?.id
      }
    ];

    console.log('🏗️ СОЗДАНИЕ УЧАСТКОВ:');
    console.log('=' .repeat(30));

    let createdCount = 0;

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
          continue;
        }

        const site = await prisma.site.create({
          data: siteData
        });

        console.log(`✅ Создан участок: ${site.name}`);
        console.log(`   📐 Площадь: ${site.area} м²`);
        if (manager) {
          console.log(`   👤 Менеджер: ${manager.name}`);
        }
        console.log(`   📝 ${site.description}`);

        // Логируем в аудит (с правильным userId)
        if (admin) {
          await prisma.auditLog.create({
            data: {
              userId: admin.id,
              action: 'CREATE_SITE',
              entity: 'SITE',
              entityId: site.id,
              details: `Создан участок: ${site.name} для объекта ${cleaningObject.name}`
            }
          });
        }

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
      console.log(`   📐 ${site.area} м²`);
      if (site.manager) console.log(`   👤 ${site.manager.name}`);
      console.log('');
    });

    // Подсчитываем общую площадь
    const totalArea = allSites.reduce((sum, site) => sum + (site.area || 0), 0);
    console.log(`📏 ОБЩАЯ ПЛОЩАДЬ ВСЕХ УЧАСТКОВ: ${totalArea} м²`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSamaraenergoSites();
