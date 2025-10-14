require('dotenv').config();
const nodemailer = require('nodemailer');

// Конфигурация для отправки тестового письма
const testConfig = {
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // Ваш email
    pass: process.env.EMAIL_PASSWORD // Ваш пароль приложения
  },
  tls: {
    rejectUnauthorized: false,
    servername: 'smtp.mail.ru'
  }
};

async function sendTestEmail() {
  try {
    console.log('📧 Отправка тестового письма...');
    
    const transporter = nodemailer.createTransport(testConfig);
    
    // Проверяем подключение
    await transporter.verify();
    console.log('✅ SMTP подключение работает');
    
    // Отправляем тестовое письмо
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Отправляем самому себе
      subject: 'Тест системы клининга - ' + new Date().toLocaleString('ru-RU'),
      text: 'Это тестовое письмо для проверки мгновенной обработки email системы.\n\nПроверяем скорость обработки и создание заданий.',
      html: `
        <h2>Тест системы клининга</h2>
        <p>Это тестовое письмо для проверки мгновенной обработки email системы.</p>
        
        <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
        
        <p>Проверяем:</p>
        <ul>
          <li>Скорость обработки (должно быть 1-2 секунды)</li>
          <li>Создание заданий для менеджеров</li>
          <li>Отправку ответных писем</li>
        </ul>
        
        <p>Если вы получили это письмо, значит система работает!</p>
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Тестовое письмо отправлено!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📧 Кому: ${process.env.EMAIL_USER}`);
    console.log(`📧 Тема: ${mailOptions.subject}`);
    console.log('\n⏰ Ожидайте обработку в течение 10 секунд...');
    console.log('👀 Смотрите логи в терминале с email-checker-mailru.js');
    
  } catch (error) {
    console.error('❌ Ошибка отправки тестового письма:', error);
  }
}

sendTestEmail();
