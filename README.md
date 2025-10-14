# Система контроля и управления для клининговой компании

Этот проект представляет собой комплексную систему для автоматизации и контроля работы клининговой компании, разработанную на стеке Next.js, Prisma, Tailwind CSS и Timeweb Cloud.

## Архитектура

- **Фронтенд:** Next.js (App Router) + React
- **Бэкенд:** Next.js API Routes
- **База данных:** Timeweb Cloud
- **ORM:** Prisma
- **Стилизация:** Tailwind CSS + shadcn/ui
- **Аутентификация:** JWT (JSON Web Tokens)
- **Хранение файлов:** Timeweb Cloud (S3-совместимое)
- **Тестирование:** Vitest (unit), Playwright (e2e)
- **Деплой:** Vercel

## Переменные окружения

Для запуска проекта создайте файл `.env` в корневой директории, скопировав в него содержимое из `.env.example`, и заполните необходимые значения.

## Локальная разработка

1.  **Клонируйте репозиторий:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Установите зависимости:**
    ```bash
    npm install
    ```

3.  **Настройте переменные окружения:**
    Создайте файл `.env` и заполните его согласно секции "Переменные окружения".

4.  **Примените миграции и заполните БД:**
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

5.  **Запустите сервер для разработки:**
    ```bash
    npm run dev
    ```

Откройте [http://localhost:3000](http://localhost:3000) в вашем браузере.

## Доступные скрипты

- `npm run dev`: запуск сервера в режиме разработки.
- `npm run build`: сборка проекта для продакшена.
- `npm run start`: запуск продакшн-сборки.
- `npm run lint`: проверка кода с помощью ESLint.
- `npm run format`: форматирование кода с помощью Prettier.
- `npm run test`: запуск unit-тестов (Vitest).
- `npm run test:e2e`: запуск e2e-тестов (Playwright).
- `npm run prisma:generate`: генерация Prisma Client.
- `npm run prisma:migrate`: создание и применение миграций БД.
- `npm run prisma:studio`: запуск Prisma Studio для просмотра и редактирования данных.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
