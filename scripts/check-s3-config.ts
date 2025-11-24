// Скрипт для проверки конфигурации S3

console.log('🔍 Проверка конфигурации S3\n');

const config = {
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ? '✅ Установлен' : '❌ Не установлен',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ? '✅ Установлен' : '❌ Не установлен',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '❌ Не установлен',
  S3_REGION: process.env.S3_REGION || 'ru-1 (по умолчанию)',
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru (по умолчанию)',
};

console.log('Переменные окружения:');
Object.entries(config).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log('\n');

if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
  console.log('⚠️  ВНИМАНИЕ: S3 не настроен!');
  console.log('Файлы будут сохраняться локально в public/uploads/');
  console.log('\nДля настройки S3 добавьте в .env:');
  console.log('  S3_ACCESS_KEY_ID=your-access-key');
  console.log('  S3_SECRET_ACCESS_KEY=your-secret-key');
  console.log('  S3_BUCKET_NAME=your-bucket-name');
  console.log('  S3_REGION=ru-1');
  console.log('  S3_ENDPOINT=https://s3.twcstorage.ru');
} else {
  console.log('✅ S3 настроен корректно!');
}
