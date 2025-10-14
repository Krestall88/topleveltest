import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/webhooks/email - Webhook для обработки входящих писем
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const emailData = await req.json();
    
    console.log('📧 Получено письмо:', {
      from: emailData.from,
      subject: emailData.subject,
      timestamp: new Date().toISOString()
    });

    // Быстрая обработка письма
    const result = await processIncomingEmailFast(emailData);
    
    const processingTime = Date.now() - startTime;
    console.log(`⚡ Письмо обработано за ${processingTime}мс`);

    return NextResponse.json({ 
      success: true, 
      processingTime,
      result 
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Ошибка обработки email webhook за ${processingTime}мс:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      processingTime 
    }, { status: 500 });
  }
}

async function processIncomingEmailFast(emailData: any) {
  const startTime = Date.now();
  
  try {
    const senderEmail = emailData.from;
    
    // Быстрая проверка привязки клиента к объекту
    const binding = await prisma.clientBinding.findFirst({
      where: { email: senderEmail },
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
      // Клиент не привязан - быстрая отправка ссылки для выбора объекта
      const result = await sendObjectSelectionEmailFast(senderEmail);
      console.log(`⚡ Отправлена ссылка для выбора объекта за ${Date.now() - startTime}мс`);
      return { action: 'object_selection_sent', processingTime: Date.now() - startTime };
    }

    // Быстрое создание дополнительного задания
    const title = emailData.subject || 'Письмо без темы';
    const content = emailData.text || emailData.html || '[Пустое письмо]';
    
    const task = await prisma.additionalTask.create({
      data: {
        title: title.length > 100 ? title.substring(0, 100) + '...' : title,
        content,
        source: 'EMAIL',
        sourceDetails: {
          from: senderEmail,
          subject: emailData.subject,
          messageId: emailData.messageId
        },
        attachments: emailData.attachments || [],
        objectId: binding.object.id,
        assignedToId: binding.object.managerId!,
        receivedAt: new Date()
      }
    });

    // Быстрая отправка подтверждения клиенту
    await sendConfirmationEmailFast(senderEmail, binding.object.name, task.id);

    console.log(`✅ Задание создано и подтверждение отправлено за ${Date.now() - startTime}мс`);
    
    return { 
      action: 'task_created', 
      taskId: task.id, 
      objectName: binding.object.name,
      processingTime: Date.now() - startTime 
    };

  } catch (error) {
    console.error(`❌ Ошибка обработки письма за ${Date.now() - startTime}мс:`, error);
    throw error;
  }
}

async function processIncomingEmail(emailData: any) {
  try {
    const senderEmail = emailData.from;
    
    // Проверяем привязку клиента к объекту
    const binding = await prisma.clientBinding.findFirst({
      where: { email: senderEmail },
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
      // Клиент не привязан - отправляем письмо с выбором объекта
      await sendObjectSelectionEmail(senderEmail);
      return;
    }

    // Создаем дополнительное задание
    const title = emailData.subject || 'Письмо без темы';
    const content = emailData.text || emailData.html || '[Пустое письмо]';
    
    const task = await prisma.additionalTask.create({
      data: {
        title: title.length > 100 ? title.substring(0, 100) + '...' : title,
        content,
        source: 'EMAIL',
        sourceDetails: {
          from: senderEmail,
          subject: emailData.subject,
          messageId: emailData.messageId
        },
        attachments: emailData.attachments || [],
        objectId: binding.object.id,
        assignedToId: binding.object.managerId!,
        receivedAt: new Date()
      }
    });

    console.log('✅ Дополнительное задание создано из email:', {
      taskId: task.id,
      objectName: binding.object.name,
      managerName: binding.object.manager?.name
    });

    // Отправляем подтверждение клиенту
    await sendConfirmationEmail(senderEmail, binding.object.name, task.id);

  } catch (error) {
    console.error('❌ Ошибка обработки письма:', error);
  }
}

async function sendObjectSelectionEmailFast(clientEmail: string) {
  const startTime = Date.now();
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const selectionUrl = `${baseUrl}/choose-object?email=${encodeURIComponent(clientEmail)}`;
    
    // Быстрый ответ клиенту (заглушка для реальной SMTP отправки)
    console.log(`📧 Быстрая отправка ссылки выбора объекта: ${clientEmail}`);
    console.log(`🔗 Ссылка: ${selectionUrl}`);
    
    // TODO: Здесь будет реальная отправка через SMTP
    // Пока возвращаем успех для тестирования
    
    return {
      success: true,
      url: selectionUrl,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error(`❌ Ошибка отправки ссылки выбора за ${Date.now() - startTime}мс:`, error);
    throw error;
  }
}

async function sendConfirmationEmailFast(clientEmail: string, objectName: string, taskId: string) {
  const startTime = Date.now();
  
  try {
    // Быстрое подтверждение клиенту
    console.log(`📧 Быстрое подтверждение для ${clientEmail}:`);
    console.log(`✅ Задание создано для объекта "${objectName}"`);
    console.log(`🆔 ID задания: ${taskId.substring(0, 8)}`);
    
    // TODO: Здесь будет реальная отправка подтверждения через SMTP
    // Пока возвращаем успех для тестирования
    
    return {
      success: true,
      objectName,
      taskId: taskId.substring(0, 8),
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error(`❌ Ошибка отправки подтверждения за ${Date.now() - startTime}мс:`, error);
    throw error;
  }
}

async function sendObjectSelectionEmail(clientEmail: string) {
  // Здесь будет отправка письма с выбором объекта
  // Пока логируем
  console.log('📧 Нужно отправить письмо с выбором объекта:', clientEmail);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const selectionUrl = `${baseUrl}/choose-object?email=${encodeURIComponent(clientEmail)}`;
  
  // TODO: Реализовать отправку email через SMTP
  console.log('🔗 Ссылка для выбора объекта:', selectionUrl);
}

async function sendConfirmationEmail(clientEmail: string, objectName: string, taskId: string) {
  // Здесь будет отправка подтверждения
  console.log('📧 Нужно отправить подтверждение:', {
    to: clientEmail,
    objectName,
    taskId: taskId.substring(0, 8)
  });
  
  // TODO: Реализовать отправку подтверждения через SMTP
}
