const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function updateManagersData() {
  try {
    console.log('🔄 ОБНОВЛЕНИЕ ДАННЫХ МЕНЕДЖЕРОВ\n');

    // Загружаем анализ
    const analysis = JSON.parse(fs.readFileSync('managers-analysis.json', 'utf8'));

    console.log('📊 ПЛАН ОБНОВЛЕНИЯ:');
    console.log(`➕ Добавить менеджеров: ${analysis.managersToAdd.length}`);
    console.log(`📝 Обновить телефоны: ${analysis.managersToUpdate.length}`);
    console.log(`❓ Менеджеров только в БД: ${analysis.managersOnlyInDB.length}`);

    // 1. Добавляем новых менеджеров
    console.log('\n➕ ДОБАВЛЕНИЕ НОВЫХ МЕНЕДЖЕРОВ:');
    console.log('='.repeat(50));

    for (const manager of analysis.managersToAdd) {
      try {
        const email = `${manager.name.toLowerCase().replace(/\s+/g, '.')}@cleaning.com`;
        
        const newManager = await prisma.user.create({
          data: {
            name: manager.name,
            email: email,
            phone: manager.phone,
            role: 'MANAGER',
            password: '$2a$10$defaultpasswordhash' // Временный пароль
          }
        });

        console.log(`✅ Добавлен: ${manager.name}`);
        console.log(`   📧 ${email}`);
        console.log(`   📱 ${manager.phone}`);

        // Логируем в аудит
        await prisma.auditLog.create({
          data: {
            userId: 'system',
            action: 'CREATE_MANAGER',
            entity: 'USER',
            details: `Добавлен менеджер: ${manager.name} (${manager.phone})`
          }
        });

      } catch (error) {
        console.log(`❌ Ошибка добавления ${manager.name}: ${error.message}`);
      }
    }

    // 2. Обновляем телефоны существующих менеджеров
    console.log('\n📝 ОБНОВЛЕНИЕ ТЕЛЕФОНОВ:');
    console.log('='.repeat(50));

    for (const update of analysis.managersToUpdate) {
      try {
        await prisma.user.updateMany({
          where: {
            name: update.name,
            role: 'MANAGER'
          },
          data: {
            phone: update.newPhone
          }
        });

        console.log(`✅ Обновлен: ${update.name}`);
        console.log(`   📱 ${update.currentPhone} → ${update.newPhone}`);

        // Логируем в аудит
        await prisma.auditLog.create({
          data: {
            userId: 'system',
            action: 'UPDATE_MANAGER_PHONE',
            entity: 'USER',
            details: `Обновлен телефон менеджера: ${update.name} (${update.currentPhone} → ${update.newPhone})`
          }
        });

      } catch (error) {
        console.log(`❌ Ошибка обновления ${update.name}: ${error.message}`);
      }
    }

    // 3. Показываем менеджеров только в БД (для принятия решения)
    console.log('\n❓ МЕНЕДЖЕРЫ ТОЛЬКО В БД (требуется решение):');
    console.log('='.repeat(50));
    
    analysis.managersOnlyInDB.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.name}`);
      console.log(`   📧 ${manager.email}`);
      console.log(`   📱 ${manager.phone || 'не указан'}`);
      console.log(`   💡 Рекомендация: Проверить актуальность, возможно удалить`);
      console.log('');
    });

    console.log('\n✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!');
    
    // Проверяем результат
    const updatedManagers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: {
        name: true,
        phone: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n📊 ИТОГО МЕНЕДЖЕРОВ В СИСТЕМЕ: ${updatedManagers.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateManagersData();
