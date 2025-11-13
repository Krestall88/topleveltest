-- Проверка созданных индексов

-- Индексы для Task
SELECT 
    'Task' as table_name,
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'Task' 
    AND indexname LIKE '%idx%'
ORDER BY indexname;

-- Индексы для CleaningObject
SELECT 
    'CleaningObject' as table_name,
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'CleaningObject' 
    AND indexname LIKE '%idx%'
ORDER BY indexname;

-- Индексы для TechCard
SELECT 
    'TechCard' as table_name,
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'TechCard' 
    AND indexname LIKE '%idx%'
ORDER BY indexname;

-- Индексы для Checklist
SELECT 
    'Checklist' as table_name,
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'Checklist' 
    AND indexname LIKE '%idx%'
ORDER BY indexname;
