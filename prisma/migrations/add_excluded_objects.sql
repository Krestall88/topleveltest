-- Создаем таблицу для хранения исключенных объектов
CREATE TABLE "ExcludedObject" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "excludedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excludedById" TEXT NOT NULL,
    
    CONSTRAINT "ExcludedObject_pkey" PRIMARY KEY ("id")
);

-- Добавляем внешние ключи
ALTER TABLE "ExcludedObject" ADD CONSTRAINT "ExcludedObject_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "CleaningObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExcludedObject" ADD CONSTRAINT "ExcludedObject_excludedById_fkey" FOREIGN KEY ("excludedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Создаем уникальный индекс чтобы один объект нельзя было исключить дважды
CREATE UNIQUE INDEX "ExcludedObject_objectId_key" ON "ExcludedObject"("objectId");
