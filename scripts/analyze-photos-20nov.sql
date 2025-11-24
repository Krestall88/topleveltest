-- Анализ фотографий и задач за 20.11.2025 для объекта Яндекс

-- 1. Найти ID объекта Яндекс
SELECT id, name, address 
FROM "CleaningObject" 
WHERE name LIKE '%Яндекс%' OR name LIKE '%Yandex%';

-- 2. Все фотографии за 20.11.2025
SELECT 
  pr.id,
  pr.url,
  pr.comment,
  pr.createdAt,
  pr.objectId,
  pr.taskId,
  pr.uploaderId,
  co.name as objectName,
  u.name as uploaderName
FROM "PhotoReport" pr
LEFT JOIN "CleaningObject" co ON pr.objectId = co.id
LEFT JOIN "User" u ON pr.uploaderId = u.id
WHERE DATE(pr.createdAt) = '2025-11-20'
ORDER BY pr.createdAt;

-- 3. Фотографии БЕЗ привязки к объекту за 20.11
SELECT 
  pr.id,
  pr.url,
  pr.comment,
  pr.createdAt,
  pr.taskId,
  pr.uploaderId,
  u.name as uploaderName
FROM "PhotoReport" pr
LEFT JOIN "User" u ON pr.uploaderId = u.id
WHERE DATE(pr.createdAt) = '2025-11-20'
  AND pr.objectId IS NULL
ORDER BY pr.createdAt;

-- 4. Все завершенные задачи за 20.11 с фото в completionPhotos
SELECT 
  t.id,
  t.description,
  t.objectName,
  t.status,
  t.completedAt,
  t.completedById,
  t.completionComment,
  array_length(t.completionPhotos, 1) as photosCount,
  t.completionPhotos,
  u.name as completedByName
FROM "Task" t
LEFT JOIN "User" u ON t.completedById = u.id
WHERE DATE(t.completedAt) = '2025-11-20'
  AND t.objectName LIKE '%Яндекс%'
  AND t.status IN ('COMPLETED', 'CLOSED_WITH_PHOTO')
ORDER BY t.completedAt;

-- 5. Подсчет фото по источникам
SELECT 
  'PhotoReport с objectId' as source,
  COUNT(*) as count
FROM "PhotoReport"
WHERE DATE(createdAt) = '2025-11-20'
  AND objectId IN (SELECT id FROM "CleaningObject" WHERE name LIKE '%Яндекс%')
UNION ALL
SELECT 
  'PhotoReport БЕЗ objectId' as source,
  COUNT(*) as count
FROM "PhotoReport"
WHERE DATE(createdAt) = '2025-11-20'
  AND objectId IS NULL
UNION ALL
SELECT 
  'Task.completionPhotos' as source,
  SUM(array_length(completionPhotos, 1)) as count
FROM "Task"
WHERE DATE(completedAt) = '2025-11-20'
  AND objectName LIKE '%Яндекс%'
  AND completionPhotos IS NOT NULL;

-- 6. Найти дубликаты фото по URL
SELECT 
  pr.url,
  COUNT(*) as duplicates,
  array_agg(pr.id) as photo_ids,
  array_agg(pr.objectId) as object_ids,
  array_agg(pr.taskId) as task_ids
FROM "PhotoReport" pr
WHERE DATE(pr.createdAt) = '2025-11-20'
GROUP BY pr.url
HAVING COUNT(*) > 1;

-- 7. Проверка связи фото с задачами
SELECT 
  pr.id as photo_id,
  pr.url,
  pr.taskId,
  pr.objectId,
  t.id as task_exists,
  t.objectName,
  t.status as task_status,
  t.completedAt
FROM "PhotoReport" pr
LEFT JOIN "Task" t ON pr.taskId = t.id
WHERE DATE(pr.createdAt) = '2025-11-20'
ORDER BY pr.createdAt;
