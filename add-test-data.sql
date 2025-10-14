-- Добавляем тестовые объекты (если их еще нет)
INSERT INTO "CleaningObject" (id, name, address, "managerId", "creatorId", "createdAt", "updatedAt")
SELECT 
  'test-gallery-id',
  'Торговый центр "Галерея"',
  'ул. Ленина, 45',
  u.id,
  u.id,
  NOW(),
  NOW()
FROM "User" u 
WHERE u.role = 'ADMIN' 
  AND NOT EXISTS (
    SELECT 1 FROM "CleaningObject" 
    WHERE name = 'Торговый центр "Галерея"'
  )
LIMIT 1;

INSERT INTO "CleaningObject" (id, name, address, "managerId", "creatorId", "createdAt", "updatedAt")
SELECT 
  'test-business-park-id',
  'Офисный центр "Бизнес-Парк"',
  'пр. Мира, 123',
  u.id,
  u.id,
  NOW(),
  NOW()
FROM "User" u 
WHERE u.role = 'ADMIN' 
  AND NOT EXISTS (
    SELECT 1 FROM "CleaningObject" 
    WHERE name = 'Офисный центр "Бизнес-Парк"'
  )
LIMIT 1;

-- Добавляем помещения для торгового центра
INSERT INTO "Room" (id, name, description, "objectId", "createdAt", "updatedAt")
SELECT 
  'room-gallery-hall',
  'Холл',
  'Главный холл торгового центра',
  'test-gallery-id',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "CleaningObject" WHERE id = 'test-gallery-id')
  AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "objectId" = 'test-gallery-id' AND name = 'Холл');

INSERT INTO "Room" (id, name, description, "objectId", "createdAt", "updatedAt")
SELECT 
  'room-gallery-office',
  'Офис 101',
  'Административный офис',
  'test-gallery-id',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "CleaningObject" WHERE id = 'test-gallery-id')
  AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "objectId" = 'test-gallery-id' AND name = 'Офис 101');

INSERT INTO "Room" (id, name, description, "objectId", "createdAt", "updatedAt")
SELECT 
  'room-gallery-toilet',
  'Туалеты 1 этаж',
  'Санузлы на первом этаже',
  'test-gallery-id',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "CleaningObject" WHERE id = 'test-gallery-id')
  AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "objectId" = 'test-gallery-id' AND name = 'Туалеты 1 этаж');

-- Добавляем помещения для офисного центра
INSERT INTO "Room" (id, name, description, "objectId", "createdAt", "updatedAt")
SELECT 
  'room-bp-corridor',
  'Коридор',
  'Главный коридор офисного центра',
  'test-business-park-id',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "CleaningObject" WHERE id = 'test-business-park-id')
  AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "objectId" = 'test-business-park-id' AND name = 'Коридор');

INSERT INTO "Room" (id, name, description, "objectId", "createdAt", "updatedAt")
SELECT 
  'room-bp-meeting',
  'Переговорная',
  'Переговорная комната',
  'test-business-park-id',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "CleaningObject" WHERE id = 'test-business-park-id')
  AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "objectId" = 'test-business-park-id' AND name = 'Переговорная');

INSERT INTO "Room" (id, name, description, "objectId", "createdAt", "updatedAt")
SELECT 
  'room-bp-kitchen',
  'Кухня',
  'Общая кухня для сотрудников',
  'test-business-park-id',
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "CleaningObject" WHERE id = 'test-business-park-id')
  AND NOT EXISTS (SELECT 1 FROM "Room" WHERE "objectId" = 'test-business-park-id' AND name = 'Кухня');

-- Добавляем базовые позиции инвентаря
INSERT INTO "InventoryItem" (id, name, quantity, unit, price, "createdAt", "updatedAt")
SELECT 
  'inv-cleaner',
  'Моющее средство универсальное',
  50,
  'л',
  150.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" WHERE name = 'Моющее средство универсальное');

INSERT INTO "InventoryItem" (id, name, quantity, unit, price, "createdAt", "updatedAt")
SELECT 
  'inv-microfiber',
  'Салфетки микрофибра',
  100,
  'шт',
  25.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" WHERE name = 'Салфетки микрофибра');

INSERT INTO "InventoryItem" (id, name, quantity, unit, price, "createdAt", "updatedAt")
SELECT 
  'inv-bags',
  'Пакеты для мусора 120л',
  200,
  'шт',
  15.00,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "InventoryItem" WHERE name = 'Пакеты для мусора 120л');
