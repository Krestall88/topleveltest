const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Список правильных менеджеров из вашего оригинального списка
const correctManagers = [
  { name: 'Ягода Ирина Александровна', phone: '+79371782997' },
  { name: 'Пленкина Наталья Алексеевна', phone: '+79874416835' },
  { name: 'Гайнуллина Айна Алиевна', phone: '+79371841382' },
  { name: 'Исайчева Маргарита Николаевна', phone: '+79277576436' },
  { name: 'Штельмашенко Ирина Николаевна', phone: '+79272618137' },
  { name: 'Халидова Лилия Ильшатовна', phone: '+79370727651' },
  { name: 'Шодиева Мухарам(Гуля) Джураевна', phone: '+79379801704' }, // Полное имя!
  { name: 'Будкова Светлана Владимировна', phone: '+79277406883' },
  { name: 'Напольская Людмила Петровна', phone: '+79370715422' },
  { name: 'Ласкин Павел Александрович', phone: '+79277570553' },
  { name: 'Васекин Александр Александрович', phone: '+79277165189' },
  { name: 'Галиев Рустам Рафикович', phone: '+79677228013' },
  { name: 'Кобзева Анна Вячеславовна', phone: '+79279035948' },
  { name: 'Нувальцева Мария Александровна', phone: '+79179582793' },
  { name: 'Гордеев Роман Владимирович', phone: '+79879551196' },
  { name: 'Соколова Ольга Константиновна', phone: '+79170173062' },
  { name: 'Тимохина Анна Анатольевна', phone: '+79198030999' },
  { name: 'Крапивко Лариса Владимировна', phone: '+79879873566' },
  { name: 'Бобровская Елена Владимировна', phone: '+79379949424' },
  { name: 'Брагина Катерина Юрьевна', phone: '+79179762778' }
];

function generateEmail(name) {
  const parts = name.toLowerCase().split(' ');
  const lastName = parts[0];
  const firstName = parts[1];
  // Убираем скобки и лишние символы
  const cleanLastName = lastName.replace(/[()]/g, '');
  const cleanFirstName = firstName.replace(/[()]/g, '');
  return `${cleanLastName}.${cleanFirstName}@cleaning.com`;
}

async function cleanupManagersFinal() {
  console.log('🧹 ФИНАЛЬНАЯ ОЧИСТКА МЕНЕДЖЕРОВ...\n');

  try {
    // 1. Анализируем текущее состояние
    console.log('📊 АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ:');
    
    const allManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        managedObjects: { select: { id: true, name: true } },
        managedSites: { select: { id: true, name: true } }
      }
    });

    console.log(`Всего менеджеров: ${allManagers.length}`);
    
    // Группируем по типам email
    const cleaningComManagers = allManagers.filter(m => m.email.endsWith('@cleaning.com'));
    const tempComManagers = allManagers.filter(m => m.email.endsWith('@temp.com'));
    
    console.log(`С @cleaning.com: ${cleaningComManagers.length}`);
    console.log(`С @temp.com: ${tempComManagers.length}\n`);

    // 2. Очищаем все назначения
    console.log('🗑️ ОЧИЩАЕМ ВСЕ НАЗНАЧЕНИЯ:');
    
    await prisma.cleaningObject.updateMany({
      data: { managerId: null }
    });
    
    await prisma.site.updateMany({
      data: { managerId: null }
    });
    
    console.log('✅ Все назначения очищены\n');

    // 3. Удаляем всех менеджеров с @temp.com
    console.log('🗑️ УДАЛЯЕМ ВРЕМЕННЫХ МЕНЕДЖЕРОВ:');
    
    for (const tempManager of tempComManagers) {
      await prisma.user.delete({ where: { id: tempManager.id } });
      console.log(`❌ Удален: ${tempManager.name} (${tempManager.email})`);
    }
    console.log('');

    // 4. Корректируем существующих менеджеров
    console.log('🔧 КОРРЕКТИРУЕМ СУЩЕСТВУЮЩИХ МЕНЕДЖЕРОВ:');
    
    const remainingManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true, phone: true }
    });

    for (const correctManager of correctManagers) {
      // Ищем существующего менеджера по имени или телефону
      let existingManager = remainingManagers.find(m => 
        m.name === correctManager.name || 
        m.phone === correctManager.phone ||
        (correctManager.name.includes('Шодиева') && m.name.includes('Шодиева'))
      );

      const correctEmail = generateEmail(correctManager.name);

      if (existingManager) {
        // Обновляем существующего
        await prisma.user.update({
          where: { id: existingManager.id },
          data: {
            name: correctManager.name,
            email: correctEmail,
            phone: correctManager.phone
          }
        });
        console.log(`✅ Обновлен: ${correctManager.name} → ${correctEmail}`);
      } else {
        // Создаем нового
        await prisma.user.create({
          data: {
            name: correctManager.name,
            email: correctEmail,
            phone: correctManager.phone,
            password: '$2b$10$defaultpasswordhash', // Временный пароль
            role: 'MANAGER'
          }
        });
        console.log(`➕ Создан: ${correctManager.name} → ${correctEmail}`);
      }
    }

    // 5. Удаляем лишних менеджеров
    console.log('\n🗑️ УДАЛЯЕМ ЛИШНИХ МЕНЕДЖЕРОВ:');
    
    const finalManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true, phone: true }
    });

    for (const manager of finalManagers) {
      const isCorrect = correctManagers.some(cm => 
        cm.name === manager.name || 
        cm.phone === manager.phone ||
        (cm.name.includes('Шодиева') && manager.name.includes('Шодиева'))
      );

      if (!isCorrect) {
        await prisma.user.delete({ where: { id: manager.id } });
        console.log(`❌ Удален лишний: ${manager.name} (${manager.email})`);
      }
    }

    // 6. Финальная проверка
    console.log('\n📈 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:');
    
    const finalCount = await prisma.user.count({ where: { role: 'MANAGER' } });
    console.log(`👥 Итого менеджеров: ${finalCount}`);
    
    if (finalCount === 20) {
      console.log('✅ УСПЕХ! Ровно 20 менеджеров как и должно быть');
    } else {
      console.log(`⚠️ ВНИМАНИЕ! Ожидалось 20, получилось ${finalCount}`);
    }

    // Показываем финальный список
    const finalManagersList = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { name: true, email: true, phone: true },
      orderBy: { name: 'asc' }
    });

    console.log('\n📋 ФИНАЛЬНЫЙ СПИСОК МЕНЕДЖЕРОВ:');
    finalManagersList.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name} (${manager.email})`);
    });

    console.log('\n🎯 ГОТОВО! Теперь можно применять скрипт назначений');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupManagersFinal();
