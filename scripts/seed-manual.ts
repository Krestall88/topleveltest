import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Маппинг разделов мануала
const manualSections = [
  {
    slug: '01-nachalo-raboty',
    title: 'Начало работы',
    icon: '🚀',
    order: 1,
    filename: '01_НАЧАЛО_РАБОТЫ.md'
  },
  {
    slug: '02-upravlenie-obektami',
    title: 'Управление объектами',
    icon: '🏢',
    order: 2,
    filename: '02_УПРАВЛЕНИЕ_ОБЪЕКТАМИ.md'
  },
  {
    slug: '03-dopolnitelnye-zadaniya',
    title: 'Дополнительные задания',
    icon: '📋',
    order: 3,
    filename: '03_ДОПОЛНИТЕЛЬНЫЕ_ЗАДАНИЯ.md'
  },
  {
    slug: '04-otchetnost-po-chek-listam',
    title: 'Отчетность по чек-листам',
    icon: '📊',
    order: 4,
    filename: '04_ОТЧЕТНОСТЬ_ПО_ЧЕК_ЛИСТАМ.md'
  },
  {
    slug: '05-telegram-bot',
    title: 'Telegram бот',
    icon: '🤖',
    order: 5,
    filename: '05_TELEGRAM_БОТ.md'
  },
  {
    slug: '06-kalendar-i-statistika',
    title: 'Календарь и статистика',
    icon: '📅',
    order: 6,
    filename: '06_КАЛЕНДАРЬ_И_СТАТИСТИКА.md'
  },
  {
    slug: '07-upravlenie-polzovatelyami',
    title: 'Управление пользователями',
    icon: '👥',
    order: 7,
    filename: '07_УПРАВЛЕНИЕ_ПОЛЬЗОВАТЕЛЯМИ.md'
  },
  {
    slug: '08-inventar-i-rashody',
    title: 'Инвентарь и расходы',
    icon: '📦',
    order: 8,
    filename: '08_ИНВЕНТАРЬ_И_РАСХОДЫ.md'
  }
];

// Функция для обработки markdown и замены меток скриншотов на компоненты
function processMarkdownContent(content: string): { processedContent: string; screenshots: Array<{ number: number; description: string; alt: string }> } {
  const screenshots: Array<{ number: number; description: string; alt: string }> = [];
  let screenshotCounter = 1;

  // Находим все метки скриншотов и заменяем их на компоненты
  const processedContent = content.replace(
    /📸 \[СКРИНШОТ: ([^\]]+)\]/g,
    (match, description) => {
      const screenshotNumber = screenshotCounter++;
      screenshots.push({
        number: screenshotNumber,
        description: description.trim(),
        alt: description.trim()
      });
      return `{{SCREENSHOT:${screenshotNumber}}}`;
    }
  );

  return { processedContent, screenshots };
}

async function seedManual() {
  console.log('🌱 Начинаем заполнение базы данных мануалом...');

  try {
    // Очищаем существующие данные
    console.log('🗑️  Очищаем существующие данные...');
    await prisma.manualScreenshot.deleteMany();
    await prisma.manualSection.deleteMany();

    const docsPath = path.join(__dirname, '..', 'docs');
    let globalScreenshotNumber = 1;

    // Обрабатываем каждый раздел
    for (const section of manualSections) {
      console.log(`📄 Обрабатываем раздел: ${section.title}`);

      const filePath = path.join(docsPath, section.filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Файл не найден: ${filePath}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const { processedContent, screenshots } = processMarkdownContent(content);

      // Создаем раздел
      await prisma.manualSection.create({
        data: {
          slug: section.slug,
          title: section.title,
          icon: section.icon,
          order: section.order,
          content: processedContent
        }
      });

      console.log(`  ✅ Раздел создан: ${section.title}`);

      // Создаем записи для скриншотов
      for (const screenshot of screenshots) {
        await prisma.manualScreenshot.create({
          data: {
            number: globalScreenshotNumber,
            filename: `screenshot-${String(globalScreenshotNumber).padStart(3, '0')}.png`,
            description: screenshot.description,
            alt: screenshot.alt
          }
        });

        console.log(`  📸 Скриншот ${globalScreenshotNumber}: ${screenshot.description}`);
        globalScreenshotNumber++;
      }
    }

    console.log(`\n✅ Заполнение завершено!`);
    console.log(`📊 Создано разделов: ${manualSections.length}`);
    console.log(`📸 Всего скриншотов: ${globalScreenshotNumber - 1}`);
    console.log(`\n📁 Поместите скриншоты в папку: public/manual/screenshots/`);
    console.log(`   Формат имени: screenshot-001.png, screenshot-002.png, и т.д.`);

  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedManual()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
