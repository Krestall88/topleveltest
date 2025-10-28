const { PrismaClient } = require('@prisma/client');

async function removeExtraAdmin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗑️ Удаляем лишнего администратора admin@example.com...\n');
    
    // Сначала проверяем, что он существует
    const extraAdmin = await prisma.user.findUnique({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (!extraAdmin) {
      console.log('✅ Лишний админ admin@example.com уже не существует');
      return;
    }
    
    console.log('📋 Информация об удаляемом админе:');
    console.log(`   ID: ${extraAdmin.id}`);
    console.log(`   Имя: ${extraAdmin.name}`);
    console.log(`   Email: ${extraAdmin.email}`);
    console.log(`   Роль: ${extraAdmin.role}`);
    
    // Проверяем, есть ли связанные данные
    const relatedData = await prisma.user.findUnique({
      where: { id: extraAdmin.id },
      include: {
        managedObjects: true,
        completedTasks: true,
        auditLogs: true,
        deputyAdminAssignments: true
      }
    });
    
    console.log('\n🔍 Проверяем связанные данные:');
    console.log(`   Управляемые объекты: ${relatedData?.managedObjects?.length || 0}`);
    console.log(`   Выполненные задачи: ${relatedData?.completedTasks?.length || 0}`);
    console.log(`   Записи аудита: ${relatedData?.auditLogs?.length || 0}`);
    console.log(`   Назначения заместителя: ${relatedData?.deputyAdminAssignments?.length || 0}`);
    
    // Если есть связанные данные, предупреждаем
    const hasRelatedData = (relatedData?.managedObjects?.length || 0) > 0 ||
                          (relatedData?.completedTasks?.length || 0) > 0 ||
                          (relatedData?.auditLogs?.length || 0) > 0 ||
                          (relatedData?.deputyAdminAssignments?.length || 0) > 0;
    
    if (hasRelatedData) {
      console.log('\n⚠️ ВНИМАНИЕ: У пользователя есть связанные данные!');
      console.log('Удаление может нарушить целостность базы данных.');
      console.log('Рекомендуется сначала очистить связанные данные.');
      return;
    }
    
    // Удаляем пользователя
    console.log('\n🗑️ Удаляем пользователя...');
    const deletedUser = await prisma.user.delete({
      where: {
        email: 'admin@example.com'
      }
    });
    
    console.log(`✅ Пользователь ${deletedUser.email} успешно удален`);
    
    // Проверяем, что удаление прошло успешно
    const checkDeleted = await prisma.user.findUnique({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (!checkDeleted) {
      console.log('✅ Подтверждено: пользователь удален из базы данных');
    } else {
      console.log('❌ Ошибка: пользователь все еще существует');
    }
    
    // Проверяем оставшихся админов
    console.log('\n📋 Оставшиеся администраторы:');
    const remainingAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    remainingAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.name} (${admin.email})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    
    if (error.code === 'P2003') {
      console.log('💡 Ошибка связанных данных. Необходимо сначала удалить связанные записи.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

removeExtraAdmin();
