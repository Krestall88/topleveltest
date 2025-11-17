import { chromium } from '@playwright/test';

async function takeScreenshots() {
  console.log('🚀 Запуск автоматического создания скриншотов...\n');
  console.log('⚠️  ВАЖНО: Убедитесь что сервер запущен на http://localhost:3000\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Скриншот 1: Страница входа (БЕЗ логина)
    console.log('📸 Скриншот 1: Страница входа');
    const loginPage = await context.newPage();
    await loginPage.goto('http://localhost:3000/login');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-001.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-001.png\n');

    // Логин в систему для остальных скриншотов
    console.log('🔐 Вход в систему...');
    await loginPage.fill('input[type="email"]', 'admin@example.com');
    await loginPage.fill('input[type="password"]', 'admin123');
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForTimeout(3000);
    console.log('✅ Вход выполнен\n');

    // Скриншот 2: Главная страница
    console.log('📸 Скриншот 2: Главная страница');
    await loginPage.goto('http://localhost:3000/');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-002.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-002.png\n');

    // Скриншот 3: Список объектов
    console.log('📸 Скриншот 3: Список объектов');
    await loginPage.goto('http://localhost:3000/objects');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-003.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-003.png\n');

    // Скриншот 4: Отчетность
    console.log('📸 Скриншот 4: Отчетность по чек-листам');
    await loginPage.goto('http://localhost:3000/reporting');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-004.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-004.png\n');

    // Скриншот 5: Telegram
    console.log('📸 Скриншот 5: Telegram');
    await loginPage.goto('http://localhost:3000/telegram');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-005.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-005.png\n');

    // Скриншот 6: Пользователи
    console.log('📸 Скриншот 6: Управление пользователями');
    await loginPage.goto('http://localhost:3000/users');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-006.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-006.png\n');

    // Скриншот 7: Инвентарь
    console.log('📸 Скриншот 7: Инвентарь');
    await loginPage.goto('http://localhost:3000/inventory');
    await loginPage.waitForTimeout(2000);
    await loginPage.screenshot({
      path: 'public/manual/screenshots/screenshot-007.png',
      fullPage: false
    });
    console.log('   ✅ screenshot-007.png\n');

    await loginPage.close();

    console.log('\n✅ Создание основных скриншотов завершено!');
    console.log('📁 Скриншоты сохранены в: public/manual/screenshots/');
    console.log('\n💡 Создано 7 основных скриншотов.');
    console.log('   Остальные 143 скриншота будут показаны как placeholder в мануале.');
    console.log('   Вы можете добавить их позже по мере необходимости.');

  } catch (error) {
    console.error('❌ Ошибка при создании скриншотов:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
