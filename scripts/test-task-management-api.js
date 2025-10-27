const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3002';

async function testTaskManagementAPI() {
  try {
    console.log('🔍 Тестируем API управления задачами отчетности...\n');
    
    // Авторизация как администратор
    console.log('🔐 Авторизация...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Ошибка авторизации: ${loginResponse.status}`);
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Авторизация успешна\n');
    
    // Создаем тестовые данные
    console.log('🏗️ Создаем тестовые данные...');
    
    // Используем тестовые данные
    let objectId = 'test-object-id';
    let managerId; // Получим из базы
    
    // Получаем ID менеджера из базы
    const usersResponse = await fetch(`${BASE_URL}/api/users`, {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      const manager = usersData.users?.find(u => u.email === 'manager@example.com');
      if (manager) {
        managerId = manager.id;
        console.log('✅ Найден менеджер:', managerId);
      }
    }
    
    if (!managerId) {
      throw new Error('Менеджер не найден');
    }
    
    console.log('✅ Используем тестовый объект:', objectId);
    
    if (!managerId) {
      throw new Error('Не удалось получить ID менеджера');
    }
    
    // 1. Создаем задачу отчетности
    console.log('\n📝 Тест 1: Создание задачи отчетности...');
    const createTaskResponse = await fetch(`${BASE_URL}/api/reporting/objects/${objectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        title: 'Тестовая задача управления',
        description: 'Описание тестовой задачи для проверки API',
        assignedToId: managerId,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
    
    if (!createTaskResponse.ok) {
      const errorData = await createTaskResponse.json().catch(() => ({}));
      throw new Error(`Ошибка создания задачи: ${createTaskResponse.status} - ${errorData.message}`);
    }
    
    const createTaskData = await createTaskResponse.json();
    const taskId = createTaskData.task.id;
    console.log('✅ Задача создана:', taskId);
    
    // 2. Получаем детальную информацию о задаче
    console.log('\n🔍 Тест 2: Получение детальной информации о задаче...');
    const getTaskResponse = await fetch(`${BASE_URL}/api/reporting/tasks/${taskId}`, {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (getTaskResponse.ok) {
      const taskData = await getTaskResponse.json();
      console.log('✅ Задача получена:');
      console.log(`   Название: ${taskData.task.title}`);
      console.log(`   Статус: ${taskData.task.status}`);
      console.log(`   Приоритет: ${taskData.task.priority}`);
      console.log(`   Назначена: ${taskData.task.assignedTo.name}`);
    } else {
      console.log('❌ Ошибка получения задачи:', getTaskResponse.status);
    }
    
    // 3. Добавляем комментарий к задаче
    console.log('\n💬 Тест 3: Добавление комментария к задаче...');
    const addCommentResponse = await fetch(`${BASE_URL}/api/reporting/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        content: 'Тестовый комментарий от администратора'
      })
    });
    
    if (addCommentResponse.ok) {
      const commentData = await addCommentResponse.json();
      console.log('✅ Комментарий добавлен:', commentData.comment.id);
    } else {
      console.log('❌ Ошибка добавления комментария:', addCommentResponse.status);
    }
    
    // 4. Получаем комментарии к задаче
    console.log('\n📋 Тест 4: Получение комментариев к задаче...');
    const getCommentsResponse = await fetch(`${BASE_URL}/api/reporting/tasks/${taskId}/comments`, {
      headers: { 'Cookie': cookies || '' }
    });
    
    if (getCommentsResponse.ok) {
      const commentsData = await getCommentsResponse.json();
      console.log(`✅ Найдено комментариев: ${commentsData.comments.length}`);
      commentsData.comments.forEach((comment, index) => {
        console.log(`   ${index + 1}. ${comment.author.name}: ${comment.content}`);
      });
    } else {
      console.log('❌ Ошибка получения комментариев:', getCommentsResponse.status);
    }
    
    // 5. Обновляем задачу (меняем статус на "В работе")
    console.log('\n🔄 Тест 5: Обновление статуса задачи...');
    const updateTaskResponse = await fetch(`${BASE_URL}/api/reporting/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        status: 'IN_PROGRESS'
      })
    });
    
    if (updateTaskResponse.ok) {
      const updateData = await updateTaskResponse.json();
      console.log('✅ Статус задачи обновлен:', updateData.task.status);
    } else {
      console.log('❌ Ошибка обновления задачи:', updateTaskResponse.status);
    }
    
    // 6. Завершаем задачу с комментарием
    console.log('\n✅ Тест 6: Завершение задачи с комментарием...');
    const completeTaskResponse = await fetch(`${BASE_URL}/api/reporting/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        status: 'COMPLETED',
        completionComment: 'Задача выполнена успешно в рамках тестирования'
      })
    });
    
    if (completeTaskResponse.ok) {
      const completeData = await completeTaskResponse.json();
      console.log('✅ Задача завершена:', completeData.task.status);
      console.log('   Комментарий завершения:', completeData.task.completionComment);
    } else {
      console.log('❌ Ошибка завершения задачи:', completeTaskResponse.status);
    }
    
    // 7. Удаляем задачу
    console.log('\n🗑️ Тест 7: Удаление задачи...');
    const deleteTaskResponse = await fetch(`${BASE_URL}/api/reporting/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Cookie': cookies || '' }
    });
    
    if (deleteTaskResponse.ok) {
      const deleteData = await deleteTaskResponse.json();
      console.log('✅ Задача удалена:', deleteData.message);
    } else {
      console.log('❌ Ошибка удаления задачи:', deleteTaskResponse.status);
    }
    
    console.log('\n🎉 Все тесты API управления задачами завершены!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testTaskManagementAPI();
