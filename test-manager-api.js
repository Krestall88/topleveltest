const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testManagerAPI() {
  console.log('🔍 Тестируем API менеджера...\n');

  try {
    // Найдем менеджера "Нувальцева Мария Александровна"
    const testManager = await prisma.user.findFirst({
      where: { 
        name: 'Нувальцева Мария Александровна',
        role: 'MANAGER'
      },
      select: { id: true, name: true }
    });

    if (!testManager) {
      console.log('❌ Тестовый менеджер не найден');
      return;
    }

    console.log(`📋 Тестируем менеджера: ${testManager.name} (ID: ${testManager.id})\n`);

    // Получаем детальную информацию как в API
    const manager = await prisma.user.findUnique({
      where: { 
        id: testManager.id,
        role: 'MANAGER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        // Объекты, которыми управляет менеджер
        managedObjects: {
          select: {
            id: true,
            name: true,
            address: true,
            description: true,
            sites: {
              where: {
                managerId: testManager.id
              },
              select: {
                id: true,
                name: true,
                description: true,
                area: true
              }
            }
          }
        },
        // Участки, которыми управляет менеджер
        managedSites: {
          select: {
            id: true,
            name: true,
            description: true,
            area: true,
            object: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        }
      }
    });

    if (!manager) {
      console.log('❌ Менеджер не найден в базе данных');
      return;
    }

    console.log('✅ РЕЗУЛЬТАТ API:');
    console.log('📋 Основная информация:');
    console.log(`   Имя: ${manager.name}`);
    console.log(`   Email: ${manager.email}`);
    console.log(`   Телефон: ${manager.phone || 'не указан'}`);
    console.log(`   Дата создания: ${manager.createdAt}`);

    console.log('\n🏢 Объекты под управлением:');
    if (manager.managedObjects.length > 0) {
      manager.managedObjects.forEach((obj, index) => {
        console.log(`   ${index + 1}. ${obj.name}`);
        console.log(`      📍 Адрес: ${obj.address}`);
        if (obj.description) {
          console.log(`      📝 Описание: ${obj.description}`);
        }
        console.log(`      🏗️ Участков менеджера в этом объекте: ${obj.sites.length}`);
        
        if (obj.sites.length > 0) {
          obj.sites.forEach((site, siteIndex) => {
            console.log(`         ${siteIndex + 1}. ${site.name}`);
            if (site.description) {
              console.log(`            📝 ${site.description}`);
            }
            if (site.area) {
              console.log(`            📐 Площадь: ${site.area} м²`);
            }
          });
        }
      });
    } else {
      console.log('   Нет объектов под управлением');
    }

    console.log('\n🏗️ Участки в других объектах:');
    if (manager.managedSites.length > 0) {
      manager.managedSites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site.name}`);
        if (site.description) {
          console.log(`      📝 ${site.description}`);
        }
        if (site.area) {
          console.log(`      📐 Площадь: ${site.area} м²`);
        }
        console.log(`      🏢 Объект: ${site.object.name}`);
        console.log(`      📍 Адрес объекта: ${site.object.address}`);
      });
    } else {
      console.log('   Нет участков в других объектах');
    }

    // Формируем ответ как в API
    const response = {
      ...manager,
      objectsCount: manager?.managedObjects?.length || 0,
      sitesCount: manager?.managedSites?.length || 0
    };

    console.log('\n📊 Итоговая статистика:');
    console.log(`   Объектов: ${response.objectsCount}`);
    console.log(`   Участков: ${response.sitesCount}`);

    console.log('\n✅ API должен вернуть корректные данные!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем тест
testManagerAPI();
