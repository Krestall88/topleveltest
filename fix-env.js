// Исправление конфликта .env файлов
const fs = require('fs');

console.log('🔧 Исправление конфликта .env файлов...');

// Читаем правильные настройки из .env
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const jwtSecretMatch = envContent.match(/JWT_SECRET="([^"]+)"/);

if (!dbUrlMatch || !jwtSecretMatch) {
  console.error('❌ Не найдены DATABASE_URL или JWT_SECRET в .env');
  process.exit(1);
}

const correctDbUrl = dbUrlMatch[1];
const correctJwtSecret = jwtSecretMatch[1];

// Создаем правильный .env.local
const newEnvLocal = `# Правильные настройки для подключения к PostgreSQL
DATABASE_URL="${correctDbUrl}"
JWT_SECRET="${correctJwtSecret}"
`;

fs.writeFileSync('.env.local', newEnvLocal);

console.log('✅ Исправлен .env.local');
console.log('📋 Новое содержимое:');
console.log('DATABASE_URL: PostgreSQL (Timeweb Cloud)');
console.log('JWT_SECRET: Из основного .env файла');
console.log('\n⚠️ Перезапустите сервер: Ctrl+C, затем npm run dev');
