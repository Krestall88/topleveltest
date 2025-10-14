require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEmailProcessing() {
  try {
    console.log('🧪 Тестирование обработки email...');
    
    // Симулируем получение письма от нового клиента
    const testEmail = 'test.client@example.com';
    const testSubject = 'Тест системы клининга';
    const testText = 'Нужна уборка в офисе';
    
    console.log(`📧 Симулируем письмо от: ${testEmail}`);
    console.log(`📧 Тема: ${testSubject}`);
    
    // Проверяем привязку к объекту
    const binding = await prisma.clientBinding.findFirst({
      where: { email: testEmail },
      include: { 
        object: { 
          include: { 
            manager: { 
              select: { id: true, name: true, email: true } 
            } 
          } 
        } 
      }
    });
    
    if (!binding) {
      console.log('🔗 Клиент не привязан к объекту');
      console.log('📤 Должно отправиться письмо с выбором объекта');
      
      // Получаем список объектов для выбора
      const objects = await prisma.cleaningObject.findMany({
        where: {
          managerId: { not: null }
        },
        include: {
          manager: {
            select: { name: true, email: true }
          }
        },
        take: 5
      });
      
      console.log(`🏢 Доступно объектов для выбора: ${objects.length}`);
      objects.forEach(obj => {
        console.log(`  - ${obj.name} (менеджер: ${obj.manager?.name})`);
      });
      
    } else {
      console.log(`🏢 Клиент привязан к объекту: ${binding.object.name}`);
      console.log(`👤 Менеджер: ${binding.object.manager?.name}`);
      
      // Создаем дополнительное задание
      const task = await prisma.additionalTask.create({
        data: {
          title: testSubject,
          description: testText,
          source: 'EMAIL',
          sourceData: {
            from: testEmail,
            subject: testSubject,
            test: true
          },
          objectId: binding.objectId,
          assignedToId: binding.object.managerId,
          status: 'NEW'
        }
      });
      
      console.log(`✅ Создано задание #${task.id}`);
    }
    
    console.log('\n✅ Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailProcessing();
