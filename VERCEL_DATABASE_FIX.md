# Исправление проблем с базой данных в Vercel

## Проблема 1: Foreign key constraint violated на PhotoReport_taskId_fkey

**Причина**: Фото загружались до материализации виртуальной задачи в БД.

**Решение**: Изменен `/api/photos/upload` - для виртуальных задач (с датой в ID) теперь:
- Загружает фото в S3
- Возвращает только URL
- НЕ создает `photoReport` сразу
- `photoReport` создается позже в `/api/tasks/unified-complete` после материализации задачи

## Проблема 2: Too many database connections

**Причина**: В serverless окружении (Vercel) каждый запрос создает новое соединение с БД, быстро исчерпывая пул.

### Решения:

#### Вариант 1: Использовать Prisma Accelerate (рекомендуется)

1. Зарегистрируйтесь на https://console.prisma.io
2. Создайте проект и получите `DATABASE_URL` с Accelerate
3. В Vercel добавьте environment variable:
   ```
   DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"
   ```

#### Вариант 2: Использовать PgBouncer (бесплатно)

1. Создайте PgBouncer instance (например, через Supabase или Railway)
2. Обновите `DATABASE_URL` в Vercel:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@pgbouncer-host:6432/DATABASE?pgbouncer=true&connection_limit=1"
   ```

#### Вариант 3: Оптимизация текущего подключения

В Vercel Environment Variables добавьте:
```
DATABASE_URL="postgresql://gen_user:PASSWORD@HOST:5432/default_db?sslmode=verify-full&connection_limit=1&pool_timeout=10&connect_timeout=5"
```

**Важно**: 
- `connection_limit=1` - каждая serverless функция использует только 1 соединение
- `pool_timeout=10` - таймаут ожидания соединения из пула
- `connect_timeout=5` - таймаут подключения к БД

### Дополнительные настройки для Vercel

В `vercel.json` добавьте:
```json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

## Что было изменено в коде:

1. **src/app/api/photos/upload/route.ts**:
   - Добавлена проверка виртуальных задач
   - Для виртуальных задач пропускается создание `photoReport`
   - Возвращается только URL фото

2. **src/lib/prisma.ts**:
   - Добавлен graceful shutdown для production
   - Добавлена явная конфигурация datasource

## Проверка после деплоя:

1. Откройте Vercel Logs
2. Проверьте, что нет ошибок "Too many connections"
3. Проверьте, что фото загружаются и задачи завершаются успешно
4. Проверьте, что `photoReport` создается после завершения задачи

## Мониторинг:

В Vercel Logs ищите:
- `✅ UNIFIED COMPLETE: Фотоотчеты созданы` - успешное создание
- `⚠️ API: Виртуальная задача, пропускаем создание photoReport` - корректная обработка
- `❌ API: Ошибка загрузки фото` - ошибки загрузки
