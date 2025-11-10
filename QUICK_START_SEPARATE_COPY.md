# ⚡ БЫСТРЫЙ СТАРТ - Отдельная презентационная копия

## 📋 ВСЕ КОМАНДЫ ПО ПОРЯДКУ

### 1️⃣ СОЗДАТЬ КОПИЮ ПРОЕКТА
```bash
# В папке C:\Users\Тайм\Documents\
cd C:\Users\Тайм\Documents\
xcopy toplevel toplevel-presentation /E /I /H
```

### 2️⃣ ОЧИСТИТЬ КОПИЮ
```powershell
cd toplevel-presentation
Remove-Item -Recurse -Force node_modules
Remove-Item .env -ErrorAction SilentlyContinue
Remove-Item .env.local -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

### 3️⃣ СОЗДАТЬ ПРОЕКТ В SUPABASE
```
1. app.supabase.com → New Project
2. Name: toplevel-presentation
3. Сохранить пароль БД!
4. Дождаться создания
```

### 4️⃣ СКОПИРОВАТЬ КЛЮЧИ
```
Settings → API:
- Project URL
- anon public key  
- service_role key

Settings → Database:
- Connection string (URI)
- Заменить [YOUR-PASSWORD]
```

### 5️⃣ НАСТРОИТЬ .ENV
```bash
# В папке toplevel-presentation
copy env.presentation.example .env.local

# Открыть .env.local и вставить ключи

# Сгенерировать секрет
openssl rand -base64 32
# Вставить в NEXTAUTH_SECRET и JWT_SECRET
```

### 6️⃣ УСТАНОВИТЬ ЗАВИСИМОСТИ
```bash
npm install
npm install @faker-js/faker --save-dev
```

### 7️⃣ СОЗДАТЬ СТРУКТУРУ БД
```bash
npx prisma generate
npx prisma db push
```

### 8️⃣ ЗАПОЛНИТЬ ДАННЫМИ
```bash
npx tsx scripts/seed-presentation.ts
```

### 9️⃣ ЗАПУСТИТЬ
```bash
npm run dev
# Или на другом порту:
npm run dev -- -p 3001
```

### 🔟 ВОЙТИ
```
http://localhost:3000 (или :3001)
admin@example.com / password123
```

---

## 💻 ОТКРЫТЬ В VS CODE

### Новое окно:
```
File → New Window
File → Open Folder → toplevel-presentation
```

### Или добавить в workspace:
```
File → Add Folder to Workspace
File → Save Workspace As
```

---

## 🔄 ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ПРОЕКТАМИ

### Рабочий проект:
```bash
cd C:\Users\Тайм\Documents\toplevel
npm run dev
```

### Презентация:
```bash
cd C:\Users\Тайм\Documents\toplevel-presentation
npm run dev -- -p 3001
```

---

## 📤 ДЕПЛОЙ НА VERCEL

```bash
cd toplevel-presentation
git init
git add .
git commit -m "Initial commit"
vercel login
vercel
```

Добавить переменные окружения в Vercel:
- vercel.com → Project → Settings → Environment Variables
- Скопировать все из .env.local

---

## ✅ ИТОГО: ~20 МИНУТ

**Полная инструкция:** `CREATE_SEPARATE_COPY.md`
