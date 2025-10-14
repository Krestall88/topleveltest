const { PrismaClient } = require('@prisma/client');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// Конфигурация IMAP для получения писем
const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST || 'imap.yandex.ru',
  port: parseInt(process.env.EMAIL_PORT || '993'),
  tls: process.env.EMAIL_SECURE === 'true' || true,
  tlsOptions: { 
    rejectUnauthorized: false,
    servername: 'imap.yandex.ru'
  }
};

// Конфигурация SMTP для отправки писем
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.yandex.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'smtp.yandex.ru'
  }
};

const transporter = nodemailer.createTransport(smtpConfig);

// Функция для разовой проверки почты (для совместимости)
function checkEmail() {
  console.log('📧 Разовая проверка почты...');
  
  const imap = new Imap(imapConfig);
  
  imap.once('ready', () => {
    console.log('✅ Подключение к почте установлено');
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('❌ Ошибка открытия папки INBOX:', err);
        return;
      }
      
      console.log(`📬 Папка INBOX открыта, всего писем: ${box.messages.total}`);
      
      // Ищем непрочитанные письма за последние 24 часа
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      imap.search([
        'UNSEEN',
        ['SINCE', yesterday]
      ], (err, results) => {
        if (err) {
          console.error('❌ Ошибка поиска писем:', err);
          imap.end();
          return;
        }
        
        if (results.length === 0) {
          console.log('📭 Новых писем нет');
          imap.end();
          return;
        }
        
        console.log(`📬 Найдено ${results.length} новых писем`);
        processMessages(imap, results);
      });
    });
  });
  
  imap.once('error', (err) => {
    console.error('❌ Ошибка IMAP подключения:', err);
  });
  
  imap.once('end', () => {
    console.log('📧 IMAP соединение закрыто');
  });
  
  imap.connect();
}

// Функция для мгновенного мониторинга (IMAP IDLE с fallback)
function startRealtimeMonitoring() {
  console.log('⚡ Запуск мониторинга в реальном времени...');
  
  const imap = new Imap(imapConfig);
  let idleSupported = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;
  
  imap.once('ready', () => {
    console.log('✅ Подключение к почте установлено');
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('❌ Ошибка открытия папки INBOX:', err);
        return;
      }
      
      console.log(`📬 Папка INBOX открыта, всего писем: ${box.messages.total}`);
      
      // Сначала обрабатываем существующие непрочитанные письма
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      imap.search([
        'UNSEEN',
        ['SINCE', yesterday]
      ], (err, results) => {
        if (err) {
          console.error('❌ Ошибка поиска существующих писем:', err);
        } else if (results.length > 0) {
          console.log(`📬 Найдено ${results.length} непрочитанных писем`);
          processMessages(imap, results);
        } else {
          console.log('📭 Непрочитанных писем нет');
        }
        
        // Пробуем запустить IDLE режим
        console.log('🔍 Проверка поддержки IDLE...');
        
        try {
          imap.idle((err) => {
            if (err) {
              console.log('⚠️ IDLE не поддерживается, переключаемся на polling');
              console.log('🔄 Запуск режима периодической проверки (каждые 30 секунд)');
              imap.end();
              startFastPolling();
              return;
            } else {
              idleSupported = true;
              console.log('⚡ IDLE режим активен - ожидание новых писем...');
            }
          });
        } catch (idleError) {
          console.log('⚠️ IDLE не поддерживается, переключаемся на polling');
          imap.end();
          startFastPolling();
          return;
        }
      });
    });
    
    // Обработчик новых писем (только если IDLE поддерживается)
    imap.on('mail', (numNewMsgs) => {
      if (!idleSupported) return;
      
      console.log(`\n📬 Получено ${numNewMsgs} новых писем!`);
      
      // Выходим из IDLE режима для обработки
      imap.idle();
      
      // Ищем новые непрочитанные письма
      imap.search(['UNSEEN'], (err, results) => {
        if (err) {
          console.error('❌ Ошибка поиска новых писем:', err);
          return;
        }
        
        if (results.length > 0) {
          console.log(`📧 Обрабатываем ${results.length} новых писем...`);
          processMessages(imap, results, () => {
            // После обработки возвращаемся в IDLE режим
            if (idleSupported) {
              imap.idle((idleErr) => {
                if (idleErr) {
                  console.error('❌ Ошибка возврата в IDLE режим:', idleErr);
                } else {
                  console.log('⚡ Возврат в IDLE режим - ожидание новых писем...');
                }
              });
            }
          });
        }
      });
    });
  });
  
  imap.once('error', (err) => {
    console.error('❌ Ошибка IMAP подключения:', err.message);
    
    reconnectAttempts++;
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('⚠️ Превышено количество попыток переподключения');
      console.log('🔄 Переключаемся на режим периодической проверки');
      startFastPolling();
      return;
    }
    
    console.log(`🔄 Попытка переподключения ${reconnectAttempts}/${maxReconnectAttempts} через 30 секунд...`);
    setTimeout(() => {
      startRealtimeMonitoring();
    }, 30000);
  });
  
  imap.once('end', () => {
    console.log('📧 IMAP соединение закрыто');
    if (reconnectAttempts < maxReconnectAttempts) {
      console.log('🔄 Попытка переподключения через 10 секунд...');
      setTimeout(() => {
        startRealtimeMonitoring();
      }, 10000);
    }
  });
  
  imap.connect();
}

// Быстрый polling как fallback (каждые 30 секунд)
function startFastPolling() {
  console.log('🔄 === РЕЖИМ БЫСТРОЙ ПРОВЕРКИ ===');
  console.log('📧 Проверка почты каждые 30 секунд');
  
  // Первая проверка сразу
  console.log('\n📬 Выполняем первую проверку почты...');
  checkEmail();
  
  // Настраиваем быструю периодическую проверку каждые 30 секунд
  const interval = 30 * 1000; // 30 секунд
  setInterval(() => {
    console.log('\n⏰ Быстрая проверка почты...');
    checkEmail();
  }, interval);
  
  console.log(`✅ Система запущена! Проверка почты каждые 30 секунд.`);
}

// Функция обработки сообщений
function processMessages(imap, results, callback) {
  const fetch = imap.fetch(results, { 
    bodies: '',
    struct: true,
    markSeen: false
  });
  
  let processedCount = 0;
  const totalCount = results.length;
  
  fetch.on('message', (msg, seqno) => {
    console.log(`📧 Обрабатываем письмо #${seqno}`);
    
    msg.on('body', (stream, info) => {
      simpleParser(stream, async (err, parsed) => {
        if (err) {
          console.error('❌ Ошибка парсинга письма:', err);
          return;
        }
        
        try {
          await processEmail(parsed);
          processedCount++;
          
          // Помечаем письмо как прочитанное
          imap.addFlags(seqno, ['\\Seen'], (flagErr) => {
            if (flagErr) {
              console.error('❌ Ошибка пометки письма как прочитанного:', flagErr);
            } else {
              console.log(`✅ Письмо #${seqno} помечено как прочитанное`);
            }
            
            // Если это последнее письмо и есть callback
            if (processedCount === totalCount && callback) {
              callback();
            }
          });
        } catch (error) {
          console.error('❌ Ошибка обработки письма:', error);
          processedCount++;
          
          // Если это последнее письмо и есть callback
          if (processedCount === totalCount && callback) {
            callback();
          }
        }
      });
    });
  });
  
  fetch.once('end', () => {
    console.log(`✅ Обработка завершена. Обработано писем: ${processedCount}/${totalCount}`);
    
    // Если нет callback, это разовая проверка
    if (!callback) {
      imap.end();
    }
  });
  
  fetch.once('error', (err) => {
    console.error('❌ Ошибка при получении писем:', err);
    if (!callback) {
      imap.end();
    }
  });
}

async function processEmail(email) {
  try {
    console.log(`\n📧 === ОБРАБОТКА ПИСЬМА ===`);
    console.log(`От: ${email.from?.text || 'Неизвестно'}`);
    console.log(`Тема: ${email.subject || 'Без темы'}`);
    console.log(`Дата: ${email.date || 'Неизвестно'}`);
    
    if (!email.from?.value?.[0]?.address) {
      console.log('❌ Не удалось определить email отправителя');
      return;
    }
    
    const senderEmail = email.from.value[0].address.toLowerCase();
    const senderName = email.from.value[0].name || senderEmail;
    
    console.log(`📧 Email отправителя: ${senderEmail}`);
    
    // Проверяем, есть ли привязка к объекту
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
      console.log('🔗 Клиент не привязан к объекту');
      await sendObjectSelectionEmail(senderEmail, senderName, email.subject);
      return;
    }
    
    console.log(`🏢 Объект: ${binding.object.name}`);
    console.log(`👤 Менеджер: ${binding.object.manager?.name || 'Не назначен'}`);
    
    if (!binding.object.managerId) {
      console.log('⚠️ У объекта нет назначенного менеджера');
      await sendNoManagerEmail(senderEmail, binding.object.name);
      return;
    }
    
    // Подготавливаем описание задания
    let description = '';
    if (email.text) {
      description = email.text.trim();
    } else if (email.html) {
      // Простое удаление HTML тегов
      description = email.html.replace(/<[^>]*>/g, '').trim();
    }
    
    // Обрабатываем вложения
    let attachments = [];
    if (email.attachments && email.attachments.length > 0) {
      console.log(`📎 Найдено вложений: ${email.attachments.length}`);
      
      for (const attachment of email.attachments) {
        if (attachment.size > 10 * 1024 * 1024) { // Ограничение 10MB
          console.log(`⚠️ Вложение ${attachment.filename} слишком большое (${attachment.size} байт)`);
          continue;
        }
        
        attachments.push({
          filename: attachment.filename || 'attachment',
          contentType: attachment.contentType || 'application/octet-stream',
          size: attachment.size || 0,
          data: attachment.content ? attachment.content.toString('base64') : null
        });
      }
    }
    
    // Создаем дополнительное задание
    const task = await prisma.additionalTask.create({
      data: {
        title: email.subject || 'Задание по email',
        description: description || 'Письмо без текста',
        source: 'EMAIL',
        sourceData: {
          from: email.from.text,
          to: email.to?.text,
          subject: email.subject,
          date: email.date?.toISOString(),
          messageId: email.messageId,
          attachments: attachments.map(a => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.size
          }))
        },
        objectId: binding.objectId,
        assignedToId: binding.object.managerId,
        status: 'NEW'
      }
    });
    
    console.log(`✅ Создано задание #${task.id}`);
    
    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: binding.object.managerId,
        action: 'CREATE_ADDITIONAL_TASK',
        entityType: 'ADDITIONAL_TASK',
        entityId: task.id,
        details: {
          source: 'EMAIL',
          senderEmail: senderEmail,
          objectName: binding.object.name,
          subject: email.subject
        }
      }
    });
    
    // Отправляем подтверждение клиенту
    await sendConfirmationEmail(senderEmail, senderName, binding.object, task);
    
    console.log(`✅ Письмо от ${senderEmail} успешно обработано`);
    
  } catch (error) {
    console.error('❌ Ошибка обработки письма:', error);
    
    // Отправляем уведомление об ошибке
    if (email.from?.value?.[0]?.address) {
      await sendErrorEmail(email.from.value[0].address, error.message);
    }
  }
}

async function sendObjectSelectionEmail(email, name, originalSubject) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const selectionUrl = `${baseUrl}/choose-object?email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Выберите объект для обслуживания',
      html: `
        <h2>Добро пожаловать в систему клининга!</h2>
        <p>Здравствуйте${name ? `, ${name}` : ''}!</p>
        
        <p>Мы получили ваше сообщение${originalSubject ? ` с темой "${originalSubject}"` : ''}.</p>
        
        <p>Для обработки вашего запроса, пожалуйста, выберите объект, с которого вы пишете:</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${selectionUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            🏢 Выбрать объект
          </a>
        </p>
        
        <p>После выбора объекта все ваши последующие сообщения будут автоматически 
           переданы ответственному менеджеру.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое сообщение системы управления клинингом.
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлена ссылка выбора объекта на ${email}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки письма с выбором объекта:', error);
  }
}

async function sendConfirmationEmail(email, name, object, task) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Задание #${task.id} принято в работу`,
      html: `
        <h2>Ваше задание принято!</h2>
        <p>Здравствуйте${name ? `, ${name}` : ''}!</p>
        
        <p>Ваше сообщение успешно получено и зарегистрировано как задание.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>📋 Детали задания:</h3>
          <p><strong>Номер задания:</strong> #${task.id}</p>
          <p><strong>Объект:</strong> ${object.name}</p>
          <p><strong>Тема:</strong> ${task.title}</p>
          <p><strong>Ответственный менеджер:</strong> ${object.manager?.name || 'Назначается'}</p>
          <p><strong>Статус:</strong> Новое</p>
        </div>
        
        <p>Менеджер получил уведомление о вашем задании и свяжется с вами в ближайшее время.</p>
        
        <p>Вы можете продолжать писать на этот email - все сообщения будут автоматически 
           переданы ответственному менеджеру.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое подтверждение. Задание создано ${new Date().toLocaleString('ru-RU')}.
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлено подтверждение на ${email} о задании #${task.id}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки подтверждения:', error);
  }
}

async function sendNoManagerEmail(email, objectName) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Временные технические работы',
      html: `
        <h2>Временные технические работы</h2>
        <p>Здравствуйте!</p>
        
        <p>Мы получили ваше сообщение для объекта "${objectName}".</p>
        
        <p>В настоящее время проводятся технические работы по назначению ответственного менеджера 
           для данного объекта.</p>
        
        <p>Пожалуйста, повторите ваш запрос через некоторое время или свяжитесь с нами 
           по телефону для срочных вопросов.</p>
        
        <p>Приносим извинения за временные неудобства.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое сообщение системы управления клинингом.
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлено уведомление об отсутствии менеджера на ${email}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления об отсутствии менеджера:', error);
  }
}

async function sendErrorEmail(email, errorMessage) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Ошибка обработки сообщения',
      html: `
        <h2>Ошибка обработки сообщения</h2>
        <p>Здравствуйте!</p>
        
        <p>К сожалению, при обработке вашего сообщения произошла техническая ошибка.</p>
        
        <p>Пожалуйста, попробуйте отправить сообщение еще раз или свяжитесь с нами 
           по телефону для решения вопроса.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Код ошибки: ${errorMessage}<br>
          Время: ${new Date().toLocaleString('ru-RU')}
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлено уведомление об ошибке на ${email}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления об ошибке:', error);
  }
}

// Функция для тестирования подключения
async function testConnection() {
  console.log('🔧 Тестирование подключения к почте...');
  
  try {
    // Тест SMTP
    await transporter.verify();
    console.log('✅ SMTP подключение работает');
    
    // Тест IMAP
    const imap = new Imap(imapConfig);
    
    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        console.log('✅ IMAP подключение работает');
        imap.end();
        resolve(true);
      });
      
      imap.once('error', (err) => {
        console.error('❌ IMAP подключение не работает:', err.message);
        reject(err);
      });
      
      imap.connect();
    });
    
  } catch (error) {
    console.error('❌ Ошибка тестирования подключения:', error.message);
    throw error;
  }
}

// Основная функция запуска
async function main() {
  console.log('🚀 === ЗАПУСК СИСТЕМЫ ПРОВЕРКИ ПОЧТЫ ===');
  console.log(`📧 Email: ${process.env.EMAIL_USER}`);
  console.log(`🏠 IMAP: ${imapConfig.host}:${imapConfig.port}`);
  console.log(`📤 SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
  
  // Проверяем аргументы командной строки для выбора режима
  const args = process.argv.slice(2);
  const mode = args[0] || 'realtime';
  
  try {
    // Тестируем подключение
    await testConnection();
    
    if (mode === 'polling') {
      console.log('\n🔄 === РЕЖИМ ПЕРИОДИЧЕСКОЙ ПРОВЕРКИ ===');
      console.log('📧 Проверка почты каждые 5 минут');
      
      // Первая проверка сразу
      console.log('\n📬 Выполняем первую проверку почты...');
      checkEmail();
      
      // Настраиваем периодическую проверку каждые 5 минут
      const interval = 5 * 60 * 1000; // 5 минут
      setInterval(() => {
        console.log('\n⏰ Периодическая проверка почты...');
        checkEmail();
      }, interval);
      
      console.log(`✅ Система запущена! Проверка почты каждые 5 минут.`);
      
    } else {
      console.log('\n⚡ === РЕЖИМ РЕАЛЬНОГО ВРЕМЕНИ ===');
      console.log('📧 Мгновенная обработка новых писем (IMAP IDLE)');
      
      // Запускаем мониторинг в реальном времени
      startRealtimeMonitoring();
      
      console.log(`✅ Система запущена! Мгновенная обработка писем.`);
    }
    
    console.log('\n📋 Доступные режимы:');
    console.log('- node email-checker.js          → Реальное время (по умолчанию)');
    console.log('- node email-checker.js polling  → Каждые 5 минут');
    console.log('\nДля остановки нажмите Ctrl+C');
    
  } catch (error) {
    console.error('❌ Не удалось запустить систему:', error.message);
    console.log('\n🔧 Проверьте настройки в .env:');
    console.log('- EMAIL_USER');
    console.log('- EMAIL_PASSWORD');
    console.log('- EMAIL_HOST');
    console.log('- SMTP_HOST');
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал остановки...');
  await prisma.$disconnect();
  console.log('✅ Соединение с базой данных закрыто');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Получен сигнал завершения...');
  await prisma.$disconnect();
  console.log('✅ Соединение с базой данных закрыто');
  process.exit(0);
});

// Запуск
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkEmail, testConnection };
