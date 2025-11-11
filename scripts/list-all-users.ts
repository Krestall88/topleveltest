import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ИЗ БАЗЫ ДАННЫХ\n');
  console.log('='.repeat(80));
  
  try {
    const users = await prisma.user.findMany({
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log(`\n📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`Всего пользователей в системе: ${users.length}\n`);

    // Группируем по ролям
    const roleGroups = {
      ADMIN: users.filter(u => u.role === 'ADMIN'),
      DEPUTY_ADMIN: users.filter(u => u.role === 'DEPUTY_ADMIN'),
      MANAGER: users.filter(u => u.role === 'MANAGER'),
      ACCOUNTANT: users.filter(u => u.role === 'ACCOUNTANT'),
      DEPUTY: users.filter(u => u.role === 'DEPUTY')
    };

    // Выводим администраторов
    if (roleGroups.ADMIN.length > 0) {
      console.log('👑 ГЛАВНЫЙ АДМИНИСТРАТОР:');
      console.log('-'.repeat(80));
      roleGroups.ADMIN.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [ХЕШИРОВАННЫЙ - см. примечание ниже]`);
        console.log(`   Роль: Главный администратор`);
        console.log(`   ID: ${user.id}`);
        if (user.phone) console.log(`   Телефон: ${user.phone}`);
        console.log('');
      });
    }

    // Выводим заместителей
    if (roleGroups.DEPUTY_ADMIN.length > 0) {
      console.log('👤 ЗАМЕСТИТЕЛИ АДМИНИСТРАТОРА:');
      console.log('-'.repeat(80));
      roleGroups.DEPUTY_ADMIN.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [ХЕШИРОВАННЫЙ - см. примечание ниже]`);
        console.log(`   Роль: Заместитель администратора`);
        console.log(`   ID: ${user.id}`);
        if (user.phone) console.log(`   Телефон: ${user.phone}`);
        console.log('');
      });
    }

    // Выводим менеджеров
    if (roleGroups.MANAGER.length > 0) {
      console.log('👨‍💼 МЕНЕДЖЕРЫ:');
      console.log('-'.repeat(80));
      roleGroups.MANAGER.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [ХЕШИРОВАННЫЙ - см. примечание ниже]`);
        console.log(`   Роль: Менеджер`);
        console.log(`   ID: ${user.id}`);
        if (user.phone) console.log(`   Телефон: ${user.phone}`);
        console.log('');
      });
    }

    // Выводим бухгалтеров
    if (roleGroups.ACCOUNTANT.length > 0) {
      console.log('💰 БУХГАЛТЕРЫ:');
      console.log('-'.repeat(80));
      roleGroups.ACCOUNTANT.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [ХЕШИРОВАННЫЙ - см. примечание ниже]`);
        console.log(`   Роль: Бухгалтер`);
        console.log(`   ID: ${user.id}`);
        if (user.phone) console.log(`   Телефон: ${user.phone}`);
        console.log('');
      });
    }

    // Выводим заместителей (старая роль)
    if (roleGroups.DEPUTY.length > 0) {
      console.log('👥 ЗАМЕСТИТЕЛИ (СТАРАЯ РОЛЬ):');
      console.log('-'.repeat(80));
      roleGroups.DEPUTY.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [ХЕШИРОВАННЫЙ - см. примечание ниже]`);
        console.log(`   Роль: Заместитель`);
        console.log(`   ID: ${user.id}`);
        if (user.phone) console.log(`   Телефон: ${user.phone}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('\n⚠️  ВАЖНОЕ ПРИМЕЧАНИЕ О ПАРОЛЯХ:');
    console.log('-'.repeat(80));
    console.log('Пароли в базе данных хранятся в хешированном виде для безопасности.');
    console.log('Это означает, что их невозможно "прочитать" напрямую.');
    console.log('');
    console.log('📋 ИЗВЕСТНЫЕ ПАРОЛИ (из скриптов создания):');
    console.log('');
    console.log('Если пользователи были созданы через стандартные скрипты:');
    console.log('  • admin@cleaning.com → admin123');
    console.log('  • accountant@cleaning.com → accountant123');
    console.log('  • nikita@cleaning.com → x8lb3zwW');
    console.log('  • Все менеджеры → manager123');
    console.log('');
    console.log('🔐 Если пароль неизвестен, его можно сбросить через:');
    console.log('  1. Функцию "Забыли пароль?" в системе');
    console.log('  2. Скрипт сброса пароля (можно создать)');
    console.log('  3. Прямое обновление в базе данных');
    console.log('');
    console.log('✅ Для создания скрипта сброса пароля, дайте команду.');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Ошибка при получении пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
