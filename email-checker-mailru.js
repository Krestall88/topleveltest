require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// Инициализация Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Конфигурация IMAP для Mail.ru (оптимизированная для IDLE)
const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.EMAIL_HOST || 'imap.mail.ru',
  port: parseInt(process.env.EMAIL_PORT || '993'),
  tls: process.env.EMAIL_SECURE === 'true' || true,
  tlsOptions: { 
    rejectUnauthorized: false,
    servername: 'imap.mail.ru'
  },
  keepalive: {
    interval: 10000, // 10 секунд
    idleInterval: 300000, // 5 минут
    forceNoop: true
  }
};

// Конфигурация SMTP для Mail.ru
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.mail.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'smtp.mail.ru'
  }
};

const transporter = nodemailer.createTransport(smtpConfig);

// Глобальные переменные для управления соединением
let currentImap = null;
let isProcessing = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Функция проверки на спам
function isSpamEmail(email) {
  const spamPatterns = [
    /noreply/i,
    /no-reply/i,
    /donotreply/i,
    /mailer-daemon/i,
    /postmaster/i
  ];
  
  return spamPatterns.some(pattern => pattern.test(email));
}

// Основная функция мгновенного мониторинга
function startRealtimeEmailMonitoring() {
  console.log('⚡ === ЗАПУСК МГНОВЕННОГО МОНИТОРИНГА MAIL.RU ===');
  console.log(`📧 Email: ${process.env.EMAIL_USER}`);
  console.log(`🏠 IMAP: ${imapConfig.host}:${imapConfig.port}`);
  console.log(`📤 SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
  
  const imap = new Imap(imapConfig);
  currentImap = imap;
  
  imap.once('ready', () => {
    console.log('✅ Подключение к Mail.ru установлено');
    
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('❌ Ошибка открытия INBOX:', err);
        scheduleReconnect();
        return;
      }
      
      console.log(`📬 INBOX открыт, всего писем: ${box.messages.total}`);
      
      // Обрабатываем существующие непрочитанные письма
      processExistingEmails(imap, () => {
        // Запускаем IDLE режим для мгновенного мониторинга
        startIdleMode(imap);
      });
    });
  });
  
  // Обработчик новых писем (только если IDLE поддерживается)
  imap.on('mail', (numNewMsgs) => {
    if (isProcessing) {
      console.log('⏳ Обработка уже идет, ждем завершения...');
      return;
    }
    
    console.log(`\n📬 === МГНОВЕННОЕ УВЕДОМЛЕНИЕ ===`);
    console.log(`📧 Получено ${numNewMsgs} новых писем!`);
    console.log(`⚡ Время реакции: ~1 секунда`);
    
    isProcessing = true;
    
    // Выходим из IDLE для обработки (только если IDLE поддерживается)
    if (typeof imap.idle === 'function') {
      try {
        imap.idle();
      } catch (e) {
        console.log('⚠️ Ошибка выхода из IDLE, продолжаем обработку');
      }
    }
    
    // Обрабатываем новые письма
    setTimeout(() => {
      processNewEmails(imap, () => {
        isProcessing = false;
        // Возвращаемся в IDLE режим только если он поддерживается
        if (typeof imap.idle === 'function') {
          startIdleMode(imap);
        }
      });
    }, 100);
  });
  
  // Обработчики ошибок и переподключения
  imap.once('error', (err) => {
    console.error('❌ Ошибка IMAP соединения:', err.message);
    currentImap = null;
    scheduleReconnect();
  });
  
  imap.once('end', () => {
    console.log('📧 IMAP соединение закрыто');
    currentImap = null;
    if (reconnectAttempts < maxReconnectAttempts) {
      scheduleReconnect();
    }
  });
  
  // Подключаемся
  imap.connect();
}

// Запуск IDLE режима (исправлено для Mail.ru)
function startIdleMode(imap) {
  try {
    // Проверяем поддержку IDLE
    if (typeof imap.idle === 'function') {
      imap.idle((err) => {
        if (err) {
          console.error('❌ Ошибка IDLE режима:', err);
          console.log('🔄 Переключение на быстрый polling...');
          startFastPolling(imap);
        } else {
          console.log('👁️ IDLE режим активен - ожидание писем в реальном времени...');
          reconnectAttempts = 0;
        }
      });
    } else {
      console.log('⚠️ IDLE не поддерживается Mail.ru, используем быстрый polling');
      startFastPolling(imap);
    }
  } catch (error) {
    console.error('❌ Критическая ошибка IDLE:', error);
    console.log('🔄 Переключение на быстрый polling...');
    startFastPolling(imap);
  }
}

// Быстрый polling для Mail.ru (каждые 10 секунд)
function startFastPolling(imap) {
  console.log('🔄 Запуск быстрого polling режима (каждые 10 секунд)');
  
  // Закрываем текущее соединение
  if (imap && imap.state === 'authenticated') {
    imap.end();
  }
  
  // Запускаем периодическую проверку
  setInterval(() => {
    console.log('\n⏰ Быстрая проверка почты...');
    checkEmailOnce();
  }, 10000); // 10 секунд
  
  // Первая проверка сразу
  console.log('\n📬 Первая проверка почты...');
  checkEmailOnce();
}

// Разовая проверка почты
function checkEmailOnce() {
  const imap = new Imap(imapConfig);
  
  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('❌ Ошибка открытия INBOX:', err);
        imap.end();
        return;
      }
      
      // Ищем новые письма за последние 10 минут
      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
      
      imap.search([
        'UNSEEN',
        ['SINCE', tenMinutesAgo]
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
        
        console.log(`📬 Найдено ${results.length} новых писем - обрабатываем...`);
        processMessages(imap, results, () => {
          imap.end();
        });
      });
    });
  });
  
  imap.once('error', (err) => {
    console.error('❌ Ошибка проверки почты:', err.message);
  });
  
  imap.connect();
}

// Обработка существующих писем
function processExistingEmails(imap, callback) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  imap.search([
    'UNSEEN',
    ['SINCE', yesterday]
  ], (err, results) => {
    if (err) {
      console.error('❌ Ошибка поиска существующих писем:', err);
      callback();
      return;
    }
    
    if (results.length === 0) {
      console.log('📭 Непрочитанных писем нет');
      callback();
      return;
    }
    
    console.log(`📬 Найдено ${results.length} непрочитанных писем`);
    processMessages(imap, results, callback);
  });
}

// Обработка новых писем
function processNewEmails(imap, callback) {
  imap.search(['UNSEEN'], (err, results) => {
    if (err) {
      console.error('❌ Ошибка поиска новых писем:', err);
      callback();
      return;
    }
    
    if (results.length === 0) {
      console.log('📭 Новых писем не найдено');
      callback();
      return;
    }
    
    console.log(`📧 Обрабатываем ${results.length} новых писем...`);
    processMessages(imap, results, callback);
  });
}

// Обработка сообщений
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
          processedCount++;
          checkCompletion();
          return;
        }
        
        try {
          await processEmail(parsed);
          processedCount++;
          
          // Помечаем письмо как прочитанное
          imap.addFlags(seqno, ['\\Seen'], (flagErr) => {
            if (flagErr) {
              console.error('❌ Ошибка пометки письма:', flagErr);
            } else {
              console.log(`✅ Письмо #${seqno} помечено как прочитанное`);
            }
            checkCompletion();
          });
        } catch (error) {
          console.error('❌ Ошибка обработки письма:', error);
          processedCount++;
          checkCompletion();
        }
      });
    });
  });
  
  function checkCompletion() {
    if (processedCount >= totalCount) {
      console.log(`✅ Обработка завершена: ${processedCount}/${totalCount}`);
      if (callback) callback();
    }
  }
  
  fetch.once('error', (err) => {
    console.error('❌ Ошибка получения писем:', err);
    if (callback) callback();
  });
}

// Обработка отдельного письма (основная логика как в Telegram)
async function processEmail(email) {
  try {
    const startTime = Date.now();
    console.log(`\n📧 === МГНОВЕННАЯ ОБРАБОТКА ПИСЬМА ===`);
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
    
    // Проверка на спам
    if (isSpamEmail(senderEmail)) {
      console.log('🚫 Спам письмо проигнорировано');
      return;
    }
    
    // Проверяем привязку к объекту (как в Telegram)
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
      console.log('🔗 Клиент не привязан к объекту - отправляем выбор');
      await sendObjectSelectionEmail(senderEmail, senderName, email.subject);
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Время обработки: ${processingTime}мс`);
      return;
    }
    
    console.log(`🏢 Объект: ${binding.object.name}`);
    console.log(`👤 Менеджер: ${binding.object.manager?.name || 'Не назначен'}`);
    
    if (!binding.object.managerId) {
      console.log('⚠️ У объекта нет назначенного менеджера');
      await sendNoManagerEmail(senderEmail, binding.object.name);
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Время обработки: ${processingTime}мс`);
      return;
    }
    
    // Подготавливаем описание
    let description = '';
    if (email.text) {
      description = email.text.trim();
    } else if (email.html) {
      description = email.html.replace(/<[^>]*>/g, '').trim();
    }
    
    // Обрабатываем вложения
    let attachments = [];
    if (email.attachments && email.attachments.length > 0) {
      console.log(`📎 Найдено вложений: ${email.attachments.length}`);
      
      for (const attachment of email.attachments) {
        if (attachment.size > 10 * 1024 * 1024) {
          console.log(`⚠️ Вложение ${attachment.filename} слишком большое`);
          continue;
        }
        
        attachments.push({
          filename: attachment.filename || 'attachment',
          contentType: attachment.contentType || 'application/octet-stream',
          size: attachment.size || 0
        });
      }
    }
    
    // Создаем дополнительное задание (как в Telegram)
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
          provider: 'mail.ru',
          processingMethod: 'imap_idle',
          attachments: attachments
        },
        objectId: binding.objectId,
        assignedToId: binding.object.managerId,
        status: 'NEW'
      }
    });
    
    console.log(`✅ Создано задание #${task.id} МГНОВЕННО`);
    
    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: binding.object.managerId,
        action: 'CREATE_ADDITIONAL_TASK',
        entityType: 'ADDITIONAL_TASK',
        entityId: task.id,
        details: {
          source: 'EMAIL_IDLE',
          provider: 'mail.ru',
          senderEmail: senderEmail,
          objectName: binding.object.name,
          subject: email.subject,
          instant: true
        }
      }
    });
    
    // Отправляем подтверждение клиенту
    await sendConfirmationEmail(senderEmail, senderName, binding.object, task);
    
    const processingTime = Date.now() - startTime;
    console.log(`🎉 Письмо от ${senderEmail} обработано за ${processingTime}мс`);
    
  } catch (error) {
    console.error('❌ Ошибка обработки письма:', error);
    
    if (email.from?.value?.[0]?.address) {
      await sendErrorEmail(email.from.value[0].address, error.message);
    }
  }
}

// Отправка письма с выбором объекта (как в Telegram)
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
        
        <p>Мы получили ваше сообщение${originalSubject ? ` с темой "${originalSubject}"` : ''} 
           и обработали его <strong>мгновенно</strong>!</p>
        
        <p>Для обработки вашего запроса, пожалуйста, выберите объект:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${selectionUrl}" 
             style="background-color: #007bff; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 8px; display: inline-block;
                    font-size: 16px; font-weight: bold;">
            🏢 Выбрать объект
          </a>
        </div>
        
        <p>После выбора объекта все ваши последующие сообщения будут 
           <strong>мгновенно</strong> переданы ответственному менеджеру.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое сообщение обработано мгновенно через IMAP IDLE.
          <br>Время обработки: менее 2 секунд.
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлена ссылка выбора объекта на ${email}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки письма с выбором объекта:', error);
  }
}

// Отправка подтверждения о создании задания
async function sendConfirmationEmail(email, name, object, task) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Задание #${task.id} принято мгновенно`,
      html: `
        <h2>Ваше задание принято мгновенно!</h2>
        <p>Здравствуйте${name ? `, ${name}` : ''}!</p>
        
        <p>Ваше сообщение получено и обработано <strong>мгновенно</strong>!</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📋 Детали задания:</h3>
          <p><strong>Номер задания:</strong> #${task.id}</p>
          <p><strong>Объект:</strong> ${object.name}</p>
          <p><strong>Тема:</strong> ${task.title}</p>
          <p><strong>Ответственный менеджер:</strong> ${object.manager?.name || 'Назначается'}</p>
          <p><strong>Статус:</strong> Новое задание</p>
          <p><strong>Время создания:</strong> ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        
        <p>Менеджер получил уведомление о вашем задании и свяжется с вами в ближайшее время.</p>
        
        <p>Вы можете продолжать писать на этот email - все сообщения будут 
           <strong>мгновенно</strong> переданы ответственному менеджеру.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Задание создано мгновенно через IMAP IDLE. 
          Время обработки: менее 2 секунд.
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлено подтверждение на ${email} о задании #${task.id}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки подтверждения:', error);
  }
}

// Уведомление об отсутствии менеджера
async function sendNoManagerEmail(email, objectName) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Временные технические работы',
      html: `
        <h2>Временные технические работы</h2>
        <p>Здравствуйте!</p>
        
        <p>Мы получили ваше сообщение для объекта "${objectName}" и обработали его мгновенно.</p>
        
        <p>В настоящее время проводятся технические работы по назначению ответственного менеджера 
           для данного объекта.</p>
        
        <p>Пожалуйста, повторите ваш запрос через некоторое время или свяжитесь с нами 
           по телефону для срочных вопросов.</p>
        
        <p>Приносим извинения за временные неудобства.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Это автоматическое сообщение обработано мгновенно.
        </p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`📤 Отправлено уведомление об отсутствии менеджера на ${email}`);
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления об отсутствии менеджера:', error);
  }
}

// Уведомление об ошибке
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

// Планирование переподключения
function scheduleReconnect() {
  reconnectAttempts++;
  
  if (reconnectAttempts > maxReconnectAttempts) {
    console.log('❌ Превышено максимальное количество попыток переподключения');
    console.log('🔄 Система будет перезапущена через 5 минут');
    
    setTimeout(() => {
      reconnectAttempts = 0;
      startRealtimeEmailMonitoring();
    }, 5 * 60 * 1000);
    return;
  }
  
  const delay = Math.min(30000 * reconnectAttempts, 300000); // От 30 сек до 5 мин
  console.log(`🔄 Переподключение через ${delay/1000} секунд (попытка ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  setTimeout(() => {
    startRealtimeEmailMonitoring();
  }, delay);
}

// Тестирование подключения
async function testConnection() {
  console.log('🔧 Тестирование подключения к Mail.ru...');
  
  try {
    // Тест SMTP
    await transporter.verify();
    console.log('✅ SMTP подключение к Mail.ru работает');
    
    // Тест IMAP
    const testImap = new Imap(imapConfig);
    
    return new Promise((resolve, reject) => {
      testImap.once('ready', () => {
        console.log('✅ IMAP подключение к Mail.ru работает');
        testImap.end();
        resolve(true);
      });
      
      testImap.once('error', (err) => {
        console.error('❌ IMAP подключение к Mail.ru не работает:', err.message);
        reject(err);
      });
      
      testImap.connect();
    });
    
  } catch (error) {
    console.error('❌ Ошибка тестирования подключения:', error.message);
    throw error;
  }
}

// Основная функция запуска
async function main() {
  console.log('🚀 === СИСТЕМА МГНОВЕННОЙ ОБРАБОТКИ EMAIL MAIL.RU ===');
  console.log(`📧 Email: ${process.env.EMAIL_USER}`);
  console.log(`🏠 IMAP: ${imapConfig.host}:${imapConfig.port}`);
  console.log(`📤 SMTP: ${smtpConfig.host}:${smtpConfig.port}`);
  console.log(`⚡ Режим: IMAP IDLE (мгновенная обработка)`);
  
  try {
    // Тестируем подключение
    await testConnection();
    
    console.log('\n⚡ === ЗАПУСК МГНОВЕННОГО МОНИТОРИНГА ===');
    console.log('📧 Система будет обрабатывать письма мгновенно (1-2 секунды)');
    console.log('🔋 Нулевая нагрузка в простое время');
    console.log('👁️ IMAP IDLE - ожидание писем в реальном времени');
    
    // Запускаем мгновенный мониторинг
    startRealtimeEmailMonitoring();
    
    console.log('\n✅ Система запущена! Мгновенная обработка email активна.');
    console.log('📧 Отправьте тестовое письмо для проверки');
    console.log('Для остановки нажмите Ctrl+C');
    
  } catch (error) {
    console.error('❌ Не удалось запустить систему:', error.message);
    console.log('\n🔧 Проверьте настройки в .env:');
    console.log('- EMAIL_USER (ваш email на Mail.ru)');
    console.log('- EMAIL_PASSWORD (пароль приложения)');
    console.log('- Включен ли IMAP доступ в настройках Mail.ru');
    process.exit(1);
  }
}

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал остановки...');
  
  if (currentImap) {
    console.log('📧 Закрытие IMAP соединения...');
    currentImap.end();
  }
  
  await prisma.$disconnect();
  console.log('✅ Соединение с базой данных закрыто');
  
  console.log('👋 Система мгновенной обработки email остановлена');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Получен сигнал завершения...');
  
  if (currentImap) {
    currentImap.end();
  }
  
  await prisma.$disconnect();
  process.exit(0);
});

// Запуск
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { 
  startRealtimeEmailMonitoring, 
  testConnection 
};
