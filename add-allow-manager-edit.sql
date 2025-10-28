-- Добавление поля allowManagerEdit в таблицу CleaningObject
ALTER TABLE "CleaningObject" ADD COLUMN "allowManagerEdit" BOOLEAN NOT NULL DEFAULT false;

-- Комментарий для документации
COMMENT ON COLUMN "CleaningObject"."allowManagerEdit" IS 'Разрешает менеджеру редактировать этот объект';
