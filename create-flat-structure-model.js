const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Сначала нужно добавить новую модель в schema.prisma
const newModelSchema = `
// Плоская таблица для динамического дерева структуры
model ObjectStructure {
  id                String   @id @default(cuid())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Основные поля
  objectName        String   // Наименование объекта
  objectAddress     String?  // Адрес
  siteName          String?  // Участок
  zoneName          String?  // Зона
  roomGroupName     String?  // Группа помещений
  roomName          String?  // Помещение
  cleaningObjectName String? // Объект уборки
  techCardName      String   // Тех задание
  frequency         String   // Периодичность
  notes             String?  // Примечания
  period            String?  // Период (летний/зимний)
  
  // Дополнительные поля для связей
  objectId          String
  siteId            String?
  zoneId            String?
  roomGroupId       String?
  roomId            String?
  cleaningObjectId  String?
  techCardId        String
  
  // Поля для UI
  workType          String?  // Тип работы
  description       String?  // Описание
  
  // Связи
  object            CleaningObject @relation(fields: [objectId], references: [id], onDelete: Cascade)
  
  @@index([objectId])
  @@index([objectName])
}
`;

async function createFlatStructure() {
  try {
    console.log('🔄 СОЗДАНИЕ ПЛОСКОЙ СТРУКТУРЫ ДЛЯ ДИНАМИЧЕСКОГО ДЕРЕВА');
    console.log('====================================================\n');

    console.log('📝 НЕОБХОДИМО ДОБАВИТЬ В schema.prisma:');
    console.log('=======================================');
    console.log(newModelSchema);
    console.log('\n⚠️ После добавления модели в schema.prisma выполните:');
    console.log('npx prisma db push');
    console.log('\n🔄 Затем запустите скрипт миграции данных...\n');

    // Получаем все данные из текущей структуры
    const objects = await prisma.cleaningObject.findMany({
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: {
                      include: {
                        cleaningObjects: {
                          include: {
                            techCards: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        techCards: {
          include: {
            room: {
              include: {
                roomGroup: {
                  include: {
                    zone: {
                      include: {
                        site: true
                      }
                    }
                  }
                }
              }
            },
            cleaningObjectItem: true
          }
        }
      }
    });

    console.log('📊 АНАЛИЗ ТЕКУЩИХ ДАННЫХ:');
    console.log('=========================');

    let totalRecords = 0;
    const structureVariants = new Set();

    for (const object of objects) {
      console.log(`\n🏢 Объект: ${object.name}`);
      
      // Анализируем структуру через техкарты
      for (const techCard of object.techCards) {
        totalRecords++;
        
        const structure = [];
        structure.push('Объект');
        
        if (techCard.room?.roomGroup?.zone?.site) {
          structure.push('Участок');
        }
        if (techCard.room?.roomGroup?.zone) {
          structure.push('Зона');
        }
        if (techCard.room?.roomGroup) {
          structure.push('Группа помещений');
        }
        if (techCard.room) {
          structure.push('Помещение');
        }
        if (techCard.cleaningObjectItem) {
          structure.push('Объект уборки');
        }
        structure.push('Техкарта');
        
        structureVariants.add(structure.join(' → '));
      }
    }

    console.log(`\n📈 Всего записей для миграции: ${totalRecords}`);
    console.log('\n🏗️ Найденные варианты структуры:');
    console.log('=================================');
    
    Array.from(structureVariants).sort().forEach((variant, index) => {
      console.log(`${index + 1}. ${variant}`);
    });

    console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('==================');
    console.log('1. Добавить модель ObjectStructure в schema.prisma');
    console.log('2. Выполнить: npx prisma db push');
    console.log('3. Запустить скрипт миграции данных');
    console.log('4. Создать API для динамического дерева');
    console.log('5. Обновить фронтенд для работы с новой структурой');

  } catch (error) {
    console.error('❌ Ошибка при анализе структуры:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createFlatStructure();
