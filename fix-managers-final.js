const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixManagersFinal() {
  try {
    console.log('🔧 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ МЕНЕДЖЕРОВ\n');

    // 1. Добавляем недостающего менеджера "Шодиева Мухарам"
    console.log('➕ ДОБАВЛЕНИЕ НЕДОСТАЮЩЕГО МЕНЕДЖЕРА:');
    console.log('='.repeat(50));

    try {
      // Проверяем, есть ли уже такой менеджер
      const existingManager = await prisma.user.findFirst({
        where: {
          name: 'Шодиева Мухарам',
          role: 'MANAGER'
        }
      });

      if (!existingManager) {
        const newManager = await prisma.user.create({
          data: {
            name: 'Шодиева Мухарам',
            email: 'shodieva.muharam.new@cleaning.com',
            phone: '+79379801704',
            role: 'MANAGER',
            password: '$2a$10$defaultpasswordhash'
          }
        });

        console.log(`✅ Добавлен: Шодиева Мухарам`);
        console.log(`   📧 shodieva.muharam.new@cleaning.com`);
        console.log(`   📱 +79379801704`);

        // Логируем в аудит
        await prisma.auditLog.create({
          data: {
            userId: 'system',
            action: 'CREATE_MANAGER',
            entity: 'USER',
            details: `Добавлен менеджер: Шодиева Мухарам (+79379801704)`
          }
        });
      } else {
        console.log(`ℹ️  Менеджер "Шодиева Мухарам" уже существует`);
      }
    } catch (error) {
      console.log(`❌ Ошибка добавления: ${error.message}`);
    }

    // 2. Удаляем дублирующих менеджеров
    console.log('\n🗑️  УДАЛЕНИЕ ДУБЛЕЙ:');
    console.log('='.repeat(50));

    // Удаляем старые записи Шодиевой
    const duplicateManagers = await prisma.user.findMany({
      where: {
        OR: [
          { name: 'Шодиева Мухарам Джураевна' },
          { name: 'Шодиева Мухарам(Гуля) Джураевна' },
          { name: 'Менеджер СБКК' }
        ],
        role: 'MANAGER'
      }
    });

    for (const manager of duplicateManagers) {
      try {
        // Проверяем, есть ли у менеджера объекты
        const objectsCount = await prisma.cleaningObject.count({
          where: { managerId: manager.id }
        });

        if (objectsCount === 0) {
          await prisma.user.delete({
            where: { id: manager.id }
          });

          console.log(`✅ Удален дубль: ${manager.name}`);
          console.log(`   📧 ${manager.email}`);

          // Логируем в аудит
          await prisma.auditLog.create({
            data: {
              userId: 'system',
              action: 'DELETE_MANAGER',
              entity: 'USER',
              details: `Удален дублирующий менеджер: ${manager.name}`
            }
          });
        } else {
          console.log(`⚠️  Не удален ${manager.name} - имеет ${objectsCount} объектов`);
        }
      } catch (error) {
        console.log(`❌ Ошибка удаления ${manager.name}: ${error.message}`);
      }
    }

    // 3. Проверяем итоговое состояние
    console.log('\n📊 ИТОГОВОЕ СОСТОЯНИЕ:');
    console.log('='.repeat(50));

    const finalManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        name: true,
        phone: true,
        email: true,
        _count: {
          select: {
            managedObjects: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    finalManagers.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   📱 ${manager.phone || 'не указан'}`);
      console.log(`   📧 ${manager.email}`);
      console.log(`   🏢 Объектов: ${manager._count.managedObjects}`);
      console.log('');
    });

    console.log(`\n✅ ИТОГО МЕНЕДЖЕРОВ: ${finalManagers.length}`);

    // 4. Показываем менеджеров из нового списка для проверки
    const newManagersList = [
      'Бобровская Елена Владимировна',
      'Брагина Катерина Юрьевна',
      'Будкова Светлана Владимировна',
      'Васекин Александр Александрович',
      'Гайнуллина Айна Алиевна',
      'Галиев Рустам Рафикович',
      'Гордеев Роман Владимирович',
      'Исайчева Маргарита Николаевна',
      'Кобзева Анна Вячеславовна',
      'Крапивко Лариса Владимировна',
      'Ласкин Павел Александрович',
      'Напольская Людмила Петровна',
      'Нувальцева Мария Александровна',
      'Пленкина Наталья Алексеевна',
      'Соколова Ольга Константиновна',
      'Тимохина Анна Анатольевна',
      'Халидова Лилия Ильшатовна',
      'Шодиева Мухарам',
      'Штельмашенко Ирина Николаевна',
      'Ягода Ирина Александровна'
    ];

    console.log('\n🎯 ПРОВЕРКА СООТВЕТСТВИЯ НОВОМУ СПИСКУ:');
    console.log('='.repeat(50));

    const currentManagerNames = finalManagers.map(m => m.name);
    const missing = newManagersList.filter(name => !currentManagerNames.includes(name));
    const extra = currentManagerNames.filter(name => !newManagersList.includes(name));

    if (missing.length === 0 && extra.length === 0) {
      console.log('✅ Все менеджеры из нового списка присутствуют в системе');
      console.log('✅ Нет лишних менеджеров в системе');
    } else {
      if (missing.length > 0) {
        console.log('❌ Отсутствующие менеджеры:');
        missing.forEach(name => console.log(`   - ${name}`));
      }
      if (extra.length > 0) {
        console.log('⚠️  Лишние менеджеры в системе:');
        extra.forEach(name => console.log(`   - ${name}`));
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixManagersFinal();
