# 📧 Настройка Email для дополнительных заданий

## Вариант 1: Gmail + IMAP (Рекомендуется)

### Шаг 1: Создание Gmail аккаунта

1. **Создайте новый Gmail аккаунт** для системы (например: `dop@yourcompany.ru`)

2. **Включите двухфакторную аутентификацию**

3. **Создайте пароль приложения**:
   - Перейдите в настройки Google аккаунта
   - Безопасность → Пароли приложений
   - Создайте пароль для "Почта"

### Шаг 2: Настройка переменных окружения

Добавьте в файл `.env.local`:

```env
# Email настройки
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=dop@yourcompany.ru
EMAIL_PASSWORD=your_app_password_here
EMAIL_SECURE=true

# SMTP для отправки
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dop@yourcompany.ru
SMTP_PASSWORD=your_app_password_here
```

### Шаг 3: Установка зависимостей

```bash
npm install imap mailparser nodemailer
npm install --save-dev @types/imap @types/mailparser @types/nodemailer
```

### Шаг 4: Настройка переадресации

1. **На рабочих почтах объектов** настройте переадресацию всех писем на `dop@yourcompany.ru`

2. **Или попросите клиентов** писать напрямую на `dop@yourcompany.ru`

## Вариант 2: Yandex Mail

### Настройка для Yandex:

```env
EMAIL_HOST=imap.yandex.ru
EMAIL_PORT=993
EMAIL_USER=dop@yandex.ru
EMAIL_PASSWORD=your_password

SMTP_HOST=smtp.yandex.ru
SMTP_PORT=587
SMTP_USER=dop@yandex.ru
SMTP_PASSWORD=your_password
```

## Вариант 3: Mail.ru

### Настройка для Mail.ru:

```env
EMAIL_HOST=imap.mail.ru
EMAIL_PORT=993
EMAIL_USER=dop@mail.ru
EMAIL_PASSWORD=your_password

SMTP_HOST=smtp.mail.ru
SMTP_PORT=587
SMTP_USER=dop@mail.ru
SMTP_PASSWORD=your_password
```

## Создание Email обработчика

Создайте файл `src/lib/email-processor.ts`:

```typescript
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

export class EmailProcessor {
  private imap: Imap;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.imap = new Imap({
      user: process.env.EMAIL_USER!,
      password: process.env.EMAIL_PASSWORD!,
      host: process.env.EMAIL_HOST!,
      port: parseInt(process.env.EMAIL_PORT!),
      tls: process.env.EMAIL_SECURE === 'true',
      tlsOptions: { rejectUnauthorized: false }
    });

    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!
      }
    });
  }

  async startListening() {
    this.imap.once('ready', () => {
      this.imap.openBox('INBOX', false, (err) => {
        if (err) throw err;
        
        this.imap.on('mail', () => {
          this.processNewEmails();
        });
      });
    });

    this.imap.connect();
  }

  private async processNewEmails() {
    // Обработка новых писем
    // Реализация будет добавлена позже
  }

  async sendObjectSelectionEmail(to: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const selectionUrl = `${baseUrl}/choose-object?email=${encodeURIComponent(to)}`;

    const html = `
      <h2>Выбор объекта для отправки заданий</h2>
      <p>Здравствуйте!</p>
      <p>Для отправки заданий по уборке, пожалуйста, выберите объект:</p>
      <p><a href="${selectionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Выбрать объект</a></p>
      <p>После выбора все ваши письма будут автоматически направляться ответственному менеджеру.</p>
    `;

    await this.transporter.sendMail({
      from: process.env.SMTP_USER!,
      to,
      subject: 'Выбор объекта для заданий по уборке',
      html
    });
  }
}
```

## Запуск Email обработчика

Создайте файл `src/scripts/start-email-processor.ts`:

```typescript
import { EmailProcessor } from '../lib/email-processor';

const processor = new EmailProcessor();
processor.startListening();

console.log('📧 Email processor started...');
```

Добавьте в `package.json`:

```json
{
  "scripts": {
    "email:start": "tsx src/scripts/start-email-processor.ts"
  }
}
```

## Тестирование

1. **Запустите email обработчик**:
   ```bash
   npm run email:start
   ```

2. **Отправьте тестовое письмо** на настроенный адрес

3. **Проверьте логи** - должно прийти письмо с выбором объекта

4. **Выберите объект** по ссылке

5. **Отправьте еще одно письмо** - должно создаться дополнительное задание

## Возможные проблемы

### Ошибки подключения к IMAP
- Проверьте настройки аккаунта
- Убедитесь, что включен доступ для небезопасных приложений
- Проверьте пароль приложения

### Письма не обрабатываются
- Проверьте права доступа к почтовому ящику
- Убедитесь, что процесс запущен и работает
- Проверьте логи на ошибки

### Не отправляются письма с выбором объекта
- Проверьте SMTP настройки
- Убедитесь в правильности учетных данных
- Проверьте, не блокируется ли отправка

## Продакшн настройки

### Для продакшена рекомендуется:

1. **Использовать корпоративную почту** вместо Gmail
2. **Настроить SSL сертификаты**
3. **Использовать почтовый сервер** с поддержкой IMAP IDLE
4. **Настроить мониторинг** процесса обработки писем
5. **Создать резервные копии** важных писем

### Безопасность:

- Используйте сильные пароли
- Ограничьте доступ к почтовому ящику
- Регулярно меняйте пароли приложений
- Мониторьте подозрительную активность
