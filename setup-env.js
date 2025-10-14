const fs = require('fs');
const crypto = require('crypto');

// Генерируем JWT секрет
const jwtSecret = crypto.randomBytes(32).toString('hex');

// Создаем содержимое .env.local файла
const envContent = `# Секретный ключ для JWT токенов
JWT_SECRET="${jwtSecret}"

# URL базы данных (используется существующая настройка)
DATABASE_URL="file:./dev.db"
`;

// Записываем файл
fs.writeFileSync('.env.local', envContent);

console.log('Файл .env.local создан успешно!');
console.log('JWT_SECRET:', jwtSecret);
console.log('\nТеперь можно войти в систему:');
console.log('Email: admin@cleaning.com');
console.log('Пароль: admin123');
