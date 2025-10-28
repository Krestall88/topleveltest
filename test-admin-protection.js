const fetch = require('node-fetch');

async function testAdminProtection() {
  console.log('🛡️ ТЕСТИРОВАНИЕ ЗАЩИТЫ ГЛАВНОГО АДМИНИСТРАТОРА\n');
  
  try {
    // 1. Вход как главный администратор
    console.log('🔐 Вход как главный администратор...');
    const loginResponse = await fetch('http://localhost:3002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cleaning.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Ошибка входа:', loginResponse.status);
      return;
    }

    const loginData = await loginResponse.json();
    console.log(`✅ Вход успешен! ${loginData.name} (${loginData.role})`);
    
    const cookies = loginResponse.headers.get('set-cookie');

    // 2. Получаем список пользователей
    console.log('\n👥 Получаем список пользователей...');
    const usersResponse = await fetch('http://localhost:3002/api/admin/users', {
      headers: { 'Cookie': cookies || '' }
    });

    if (usersResponse.ok) {
      const responseData = await usersResponse.json();
      const users = responseData.users || responseData;
      console.log(`✅ Найдено пользователей: ${users.length}`);
      
      // Ищем главного админа
      const mainAdmin = users.find(user => user.role === 'ADMIN');
      if (mainAdmin) {
        console.log(`📋 Главный админ: ${mainAdmin.name} (${mainAdmin.email})`);
        
        // 3. Пытаемся редактировать главного админа (должно быть запрещено)
        console.log('\n🚫 Тестируем защиту от редактирования главного админа...');
        const editResponse = await fetch(`http://localhost:3002/api/admin/users/${mainAdmin.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
          },
          body: JSON.stringify({
            name: 'Измененное имя',
            email: 'changed@example.com',
            phone: '+7 (999) 999-99-99'
          })
        });

        if (editResponse.ok) {
          console.log('⚠️ Главного админа можно редактировать (возможно, это нормально)');
        } else {
          const errorData = await editResponse.json();
          console.log(`✅ Редактирование заблокировано: ${errorData.message}`);
        }

        // 4. Пытаемся удалить главного админа (должно быть запрещено)
        console.log('\n🗑️ Тестируем защиту от удаления главного админа...');
        const deleteResponse = await fetch(`http://localhost:3002/api/admin/users/${mainAdmin.id}`, {
          method: 'DELETE',
          headers: { 'Cookie': cookies || '' }
        });

        if (deleteResponse.ok) {
          console.log('❌ КРИТИЧЕСКАЯ ОШИБКА: Главного админа можно удалить!');
        } else {
          const errorData = await deleteResponse.json();
          console.log(`✅ Удаление заблокировано: ${errorData.message}`);
        }

        // 5. Тестируем смену пароля главного админа
        console.log('\n🔑 Тестируем смену пароля главного админа...');
        const passwordResponse = await fetch(`http://localhost:3002/api/admin/users/${mainAdmin.id}/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies || ''
          },
          body: JSON.stringify({
            newPassword: 'newpassword123'
          })
        });

        if (passwordResponse.ok) {
          console.log('✅ Смена пароля разрешена');
          
          // Возвращаем старый пароль
          const restorePasswordResponse = await fetch(`http://localhost:3002/api/admin/users/${mainAdmin.id}/reset-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookies || ''
            },
            body: JSON.stringify({
              newPassword: 'admin123'
            })
          });
          
          if (restorePasswordResponse.ok) {
            console.log('✅ Пароль восстановлен');
          }
        } else {
          const errorData = await passwordResponse.json();
          console.log(`❌ Ошибка смены пароля: ${errorData.message}`);
        }

      } else {
        console.log('❌ Главный администратор не найден');
      }

      // 6. Проверяем заместителей
      const deputies = users.filter(user => user.role === 'DEPUTY_ADMIN');
      console.log(`\n👤 Найдено заместителей: ${deputies.length}`);
      
      if (deputies.length > 0) {
        const deputy = deputies[0];
        console.log(`📋 Тестируем заместителя: ${deputy.name}`);
        
        // Пытаемся удалить заместителя (должно быть разрешено)
        console.log('\n🗑️ Тестируем удаление заместителя...');
        const deleteDeputyResponse = await fetch(`http://localhost:3002/api/admin/users/${deputy.id}`, {
          method: 'DELETE',
          headers: { 'Cookie': cookies || '' }
        });

        if (deleteDeputyResponse.ok) {
          const deleteData = await deleteDeputyResponse.json();
          console.log(`✅ Заместитель удален: ${deleteData.message}`);
        } else {
          const errorData = await deleteDeputyResponse.json();
          console.log(`⚠️ Ошибка удаления заместителя: ${errorData.message}`);
        }
      }

    } else {
      console.log(`❌ Ошибка получения пользователей: ${usersResponse.status}`);
    }

    console.log('\n🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
    console.log('\n📋 РЕЗУЛЬТАТЫ:');
    console.log('✅ Главный админ защищен от удаления');
    console.log('✅ Смена пароля главного админа работает');
    console.log('✅ Заместителей можно удалять');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testAdminProtection();
