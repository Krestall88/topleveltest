import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 ПЕРЕИМЕНОВАНИЕ ОСТАВШИХСЯ ОБЪЕКТОВ\n');
  
  const renames = [
    {
      from: 'ОАО «Самарский хлебозавод №5»',
      to: 'ОАО "Самарский хлебозавод №5"'
    },
    {
      from: 'ЗАО «СБКК»',
      to: 'ЗАО  «СБКК»'
    },
    {
      from: 'ООО «ФЛАГМАН»',
      to: 'ООО "ФЛАГМАН"'
    }
  ];
  
  let renamed = 0;
  
  for (const rename of renames) {
    const object = await prisma.cleaningObject.findFirst({
      where: { name: rename.from }
    });
    
    if (object) {
      await prisma.cleaningObject.update({
        where: { id: object.id },
        data: { name: rename.to }
      });
      console.log(`✅ Переименован: "${rename.from}"`);
      console.log(`   В: "${rename.to}"\n`);
      renamed++;
    } else {
      console.log(`⚠️  Не найден: "${rename.from}"\n`);
    }
  }
  
  // Создаем недостающие объекты
  console.log('\n📝 СОЗДАНИЕ НЕДОСТАЮЩИХ ОБЪЕКТОВ\n');
  
  const missingObjects = [
    {
      name: 'ООО «Альфа» (ТЦ Мелодия)',
      address: 'Адрес не указан'
    },
    {
      name: 'ООО "Электрощит-Инжиниринг"',
      address: 'г. Самара'
    }
  ];
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!admin) {
    throw new Error('Администратор не найден!');
  }
  
  let created = 0;
  
  for (const obj of missingObjects) {
    const existing = await prisma.cleaningObject.findFirst({
      where: { name: obj.name }
    });
    
    if (!existing) {
      await prisma.cleaningObject.create({
        data: {
          name: obj.name,
          address: obj.address,
          creatorId: admin.id,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        }
      });
      console.log(`✅ Создан: "${obj.name}"`);
      created++;
    } else {
      console.log(`⚠️  Уже существует: "${obj.name}"`);
    }
  }
  
  console.log(`\n✅ Переименовано: ${renamed}`);
  console.log(`✅ Создано: ${created}\n`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
