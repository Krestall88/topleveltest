# Реализация улучшений для дополнительных заданий

## ✅ Выполнено

### 1. База данных
- ✅ Добавлено поле `completionPhotos` в модель `AdditionalTask`
- ✅ Создана модель `AdditionalTaskComment` для комментариев
- ✅ Обновлена связь в модели `User`
- ✅ Применены изменения через `prisma db push`

### 2. API
- ✅ Создан `/api/additional-tasks/[id]/comments/route.ts` для GET и POST комментариев
- ✅ Обновлен `/api/additional-tasks/[id]/route.ts` для поддержки `completionPhotos`
- ✅ Обновлена функция `verifyToken` в `/src/lib/auth.ts`

### 3. Типы
- ✅ Добавлены `completionPhotos` и `comments` в интерфейс `AdditionalTask`
- ✅ Создан интерфейс `AdditionalTaskComment`

### 4. UI - Вкладки
- ✅ Переименованы вкладки с "По менеджерам"/"Список" на "📄 На исполнение"/"✅ Выполнено"
- ✅ Вкладка "На исполнение" показывает задания NEW и IN_PROGRESS
- ✅ Вкладка "Выполнено" показывает задания COMPLETED

## 🔄 В процессе / Требуется реализация

### 5. Загрузка фотографий при закрытии задания

**Файл:** `src/components/AdditionalTaskCard.tsx`

**Что нужно сделать:**
1. Добавить компонент загрузки файлов в форму закрытия задания (строки 243-286)
2. Использовать существующий API `/api/upload` для загрузки фотографий
3. Сохранять URL загруженных фотографий в state
4. Передавать массив URL в `completionPhotos` при вызове `handleCompleteTask`

**Пример кода для добавления:**
```tsx
const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
const [uploading, setUploading] = useState(false);

const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  setUploading(true);
  const uploadedUrls: string[] = [];

  for (const file of Array.from(files)) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        uploadedUrls.push(data.url);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  }

  setCompletionPhotos([...completionPhotos, ...uploadedUrls]);
  setUploading(false);
};

// В handleCompleteTask добавить:
const response = await onStatusChange(task.id, 'complete', completionNote, completionPhotos);
```

### 6. Система комментариев

**Файлы для создания:**
- `src/components/AdditionalTaskComments.tsx` - компонент для отображения и добавления комментариев

**Что нужно сделать:**
1. Создать компонент для отображения списка комментариев
2. Разделить комментарии администратора (выделить цветом) и менеджера
3. Добавить форму для добавления нового комментария
4. Интегрировать в `AdditionalTaskCard` после блока "Информация о выполнении"

**Пример структуры:**
```tsx
interface AdditionalTaskCommentsProps {
  taskId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export default function AdditionalTaskComments({ taskId, currentUserId, isAdmin }: AdditionalTaskCommentsProps) {
  const [comments, setComments] = useState<AdditionalTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    const response = await fetch(`/api/additional-tasks/${taskId}/comments`);
    if (response.ok) {
      const data = await response.json();
      setComments(data);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    const response = await fetch(`/api/additional-tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });

    if (response.ok) {
      const comment = await response.json();
      setComments([...comments, comment]);
      setNewComment('');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Комментарии</h4>
      
      {/* Список комментариев */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`p-3 rounded-lg ${
              comment.isAdmin
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">
                {comment.isAdmin ? '👨‍💼 Администратор' : '👤 Менеджер'}: {comment.user?.name}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString('ru-RU')}
              </span>
            </div>
            <p className="text-sm text-gray-800">{comment.content}</p>
          </div>
        ))}
      </div>

      {/* Форма добавления комментария */}
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAdmin ? 'Оставьте комментарий для менеджера...' : 'Ответьте администратору...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || loading}
          className="w-full"
        >
          {loading ? 'Отправка...' : 'Добавить комментарий'}
        </Button>
      </div>
    </div>
  );
}
```

### 7. Real-time уведомления

**Подход:** Использовать polling (опрос сервера каждые N секунд)

**Файлы для создания:**
- `src/hooks/useTaskPolling.ts` - хук для периодического опроса новых заданий
- `src/hooks/useNotifications.ts` - хук для отображения уведомлений

**Что нужно сделать:**

1. **Создать хук для polling:**
```tsx
// src/hooks/useTaskPolling.ts
import { useEffect, useRef } from 'react';

export function useTaskPolling(callback: () => void, interval: number = 30000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
}
```

2. **Интегрировать в AdditionalTasksClientPage:**
```tsx
const [lastCheckTime, setLastCheckTime] = useState(new Date());
const [newTasksCount, setNewTasksCount] = useState(0);

useTaskPolling(async () => {
  const response = await fetch(`/api/additional-tasks?since=${lastCheckTime.toISOString()}`);
  if (response.ok) {
    const newTasks = await response.json();
    if (newTasks.length > 0) {
      setNewTasksCount(newTasks.length);
      // Показать уведомление
      showNotification(`Получено ${newTasks.length} новых заданий!`);
      // Обновить список
      fetchTasks();
    }
    setLastCheckTime(new Date());
  }
}, 30000); // Проверять каждые 30 секунд
```

3. **Добавить API endpoint для получения новых заданий:**
```tsx
// src/app/api/additional-tasks/route.ts
// Добавить параметр ?since=timestamp для фильтрации
if (since) {
  where.createdAt = { gte: new Date(since) };
}
```

4. **Добавить визуальный индикатор новых заданий:**
```tsx
{newTasksCount > 0 && (
  <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce">
    🔔 {newTasksCount} новых заданий!
    <button onClick={() => { fetchTasks(); setNewTasksCount(0); }}>
      Обновить
    </button>
  </div>
)}
```

## 📋 Порядок реализации

1. ✅ База данных и API (выполнено)
2. ✅ Вкладки (выполнено)
3. ⏳ Загрузка фотографий при закрытии
4. ⏳ Система комментариев
5. ⏳ Real-time уведомления

## 🔧 Дополнительные улучшения

- Добавить отображение `completionPhotos` в карточке выполненного задания
- Добавить возможность просмотра фотографий в полноэкранном режиме
- Добавить звуковое уведомление при получении нового задания
- Добавить счетчик непрочитанных комментариев
- Добавить фильтр "Задания с комментариями"

## 🐛 Известные проблемы

- Нужно перезапустить сервер после обновления Prisma Client
- Возможна блокировка файла `query_engine-windows.dll.node` - перезапустить IDE

## 🚀 Для деплоя

1. Закоммитить изменения
2. Запустить `npm run build` для проверки
3. Задеплоить на Vercel
4. Проверить работу на продакшене
