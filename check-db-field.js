const { PrismaClient } = require('@prisma/client');

async function checkDbField() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Проверяем структуру таблицы CleaningObject...\n');
    
    // Попробуем получить объект с полем allowManagerEdit
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'CleaningObject' 
      AND column_name = 'allowManagerEdit'
    `;
    
    if (result.length > 0) {
      console.log('✅ Поле allowManagerEdit существует:');
      console.log(result[0]);
    } else {
      console.log('❌ Поле allowManagerEdit НЕ существует');
      
      // Попробуем добавить поле
      console.log('\n🔧 Добавляем поле allowManagerEdit...');
      
      await prisma.$executeRaw`
        ALTER TABLE "CleaningObject" 
        ADD COLUMN "allowManagerEdit" BOOLEAN NOT NULL DEFAULT false
      `;
      
      console.log('✅ Поле добавлено успешно');
    }
    
    // Проверим несколько объектов
    console.log('\n📊 Проверяем объекты с менеджерами...');
    const objects = await prisma.cleaningObject.findMany({
      where: {
        managerId: { not: null }
      },
      select: {
        id: true,
        name: true,
        allowManagerEdit: true,
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 3
    });
    
    objects.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      console.log(`   Менеджер: ${obj.manager?.name}`);
      console.log(`   allowManagerEdit: ${obj.allowManagerEdit}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDbField();
