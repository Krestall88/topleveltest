const { PrismaClient } = require('@prisma/client');

async function getAllCredentials() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔐 СПИСОК ВСЕХ ЛОГИНОВ И ПАРОЛЕЙ СИСТЕМЫ\n');
    console.log('=' .repeat(80));
    
    // Получаем всех пользователей
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`📊 ОБЩАЯ СТАТИСТИКА:`);
    console.log(`Всего пользователей в системе: ${allUsers.length}\n`);
    
    // Группируем по ролям
    const usersByRole = {
      'ADMIN': allUsers.filter(u => u.role === 'ADMIN'),
      'DEPUTY_ADMIN': allUsers.filter(u => u.role === 'DEPUTY_ADMIN'),
      'MANAGER': allUsers.filter(u => u.role === 'MANAGER'),
      'ACCOUNTANT': allUsers.filter(u => u.role === 'ACCOUNTANT'),
      'CLIENT': allUsers.filter(u => u.role === 'CLIENT')
    };
    
    // Выводим по ролям
    console.log('👑 ГЛАВНЫЙ АДМИНИСТРАТОР:');
    console.log('-'.repeat(50));
    usersByRole.ADMIN.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   Логин: ${user.email}`);
      console.log(`   Пароль: admin123`); // Известный пароль админа
      console.log(`   Роль: Главный администратор`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });
    
    console.log('👤 ЗАМЕСТИТЕЛИ АДМИНИСТРАТОРА:');
    console.log('-'.repeat(50));
    if (usersByRole.DEPUTY_ADMIN.length === 0) {
      console.log('   Заместители не найдены\n');
    } else {
      usersByRole.DEPUTY_ADMIN.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'Без имени'}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [нужно сбросить через админ панель]`);
        console.log(`   Роль: Заместитель администратора`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
    console.log('👨‍💼 МЕНЕДЖЕРЫ:');
    console.log('-'.repeat(50));
    usersByRole.MANAGER.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Без имени'}`);
      console.log(`   Логин: ${user.email}`);
      console.log(`   Пароль: manager123`); // Стандартный пароль менеджеров
      console.log(`   Роль: Менеджер`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });
    
    console.log('💰 БУХГАЛТЕРЫ:');
    console.log('-'.repeat(50));
    if (usersByRole.ACCOUNTANT.length === 0) {
      console.log('   Бухгалтеры не найдены\n');
    } else {
      usersByRole.ACCOUNTANT.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'Без имени'}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: accountant123`); // Стандартный пароль бухгалтеров
        console.log(`   Роль: Бухгалтер`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
    console.log('👥 КЛИЕНТЫ:');
    console.log('-'.repeat(50));
    if (usersByRole.CLIENT.length === 0) {
      console.log('   Клиенты не найдены\n');
    } else {
      usersByRole.CLIENT.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'Без имени'}`);
        console.log(`   Логин: ${user.email}`);
        console.log(`   Пароль: [устанавливается индивидуально]`);
        console.log(`   Роль: Клиент`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
    
    // Сводная таблица для быстрого доступа
    console.log('=' .repeat(80));
    console.log('📋 СВОДНАЯ ТАБЛИЦА ДЛЯ БЫСТРОГО ДОСТУПА:');
    console.log('=' .repeat(80));
    console.log('| Роль                    | Количество | Стандартный пароль    |');
    console.log('|-------------------------|------------|-----------------------|');
    console.log(`| Главный администратор   | ${usersByRole.ADMIN.length.toString().padEnd(10)} | admin123              |`);
    console.log(`| Заместители админа      | ${usersByRole.DEPUTY_ADMIN.length.toString().padEnd(10)} | [индивидуальный]      |`);
    console.log(`| Менеджеры              | ${usersByRole.MANAGER.length.toString().padEnd(10)} | manager123            |`);
    console.log(`| Бухгалтеры             | ${usersByRole.ACCOUNTANT.length.toString().padEnd(10)} | accountant123         |`);
    console.log(`| Клиенты                | ${usersByRole.CLIENT.length.toString().padEnd(10)} | [индивидуальный]      |`);
    console.log('=' .repeat(80));
    
    // Создаем CSV файл для удобства
    const csvContent = [
      'Имя,Email,Роль,Пароль,ID',
      ...allUsers.map(user => {
        let password = '[индивидуальный]';
        switch(user.role) {
          case 'ADMIN': password = 'admin123'; break;
          case 'MANAGER': password = 'manager123'; break;
          case 'ACCOUNTANT': password = 'accountant123'; break;
        }
        return `"${user.name || 'Без имени'}","${user.email}","${user.role}","${password}","${user.id}"`;
      })
    ].join('\n');
    
    // Сохраняем в файл
    const fs = require('fs');
    fs.writeFileSync('credentials-list.csv', csvContent, 'utf8');
    
    console.log('\n💾 Список также сохранен в файл: credentials-list.csv');
    console.log('\n⚠️  ВАЖНО: Храните этот список в безопасном месте!');
    
  } catch (error) {
    console.error('❌ Ошибка получения данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAllCredentials();
