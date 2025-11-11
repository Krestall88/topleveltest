import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Данные из parsed-managers-data.json
const managerAssignments = [
  {
    name: 'Брагина Катерина Юрьевна',
    phone: '+79179762778',
    objects: [
      { company: 'ЗАО «СБКК»', address: 'г. Самара, Московское шоссе, 234' }
    ]
  },
  {
    name: 'Тимохина Анна Анатольевна',
    phone: '+79198030999',
    objects: [
      { company: 'Тяжмаш', address: 'Гидротурбинная' }
    ]
  },
  {
    name: 'Гордеев Роман Владимирович',
    phone: '+79879551196',
    objects: [
      { company: 'Маркет', address: 'Яндекс' }
    ]
  },
  {
    name: 'Ласкин Павел Александрович',
    phone: '+79277570553',
    objects: [
      { company: 'ПепсиКо', address: 'ПепсиКо' }
    ]
  }
];

async function main() {
  console.log('🔧 Восстановление связей менеджеров с объектами...\n');

  for (const assignment of managerAssignments) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 Менеджер: ${assignment.name}`);
    console.log('='.repeat(80));

    // Находим менеджера
    const manager = await prisma.user.findFirst({
      where: {
        name: assignment.name,
        role: 'MANAGER'
      }
    });

    if (!manager) {
      console.log(`❌ Менеджер не найден в базе данных`);
      continue;
    }

    console.log(`✅ Найден: ${manager.email} (ID: ${manager.id})`);

    // Обрабатываем каждый объект
    for (const objData of assignment.objects) {
      console.log(`\n📦 Поиск объекта: ${objData.company}`);
      console.log(`   Адрес: ${objData.address}`);

      // Ищем объект по названию или адресу
      const object = await prisma.cleaningObject.findFirst({
        where: {
          OR: [
            { name: { contains: objData.company.replace(/[«»"]/g, ''), mode: 'insensitive' } },
            { address: { contains: objData.address, mode: 'insensitive' } }
          ]
        },
        include: {
          manager: true
        }
      });

      if (!object) {
        console.log(`   ❌ Объект не найден в базе данных`);
        continue;
      }

      console.log(`   ✅ Найден объект: ${object.name}`);
      console.log(`   📍 Адрес: ${object.address}`);
      console.log(`   👤 Текущий менеджер: ${object.manager?.name || 'не назначен'}`);

      // Проверяем, не назначен ли уже этот менеджер
      if (object.managerId === manager.id) {
        console.log(`   ℹ️  Менеджер уже назначен на этот объект`);
        continue;
      }

      // Назначаем менеджера на объект
      try {
        await prisma.cleaningObject.update({
          where: { id: object.id },
          data: { managerId: manager.id }
        });
        console.log(`   ✅ Менеджер успешно назначен на объект`);
      } catch (error) {
        console.error(`   ❌ Ошибка при назначении:`, error);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Восстановление завершено');
  console.log('='.repeat(80));

  // Проверяем результат
  console.log('\n📊 Проверка результатов...\n');
  
  for (const assignment of managerAssignments) {
    const manager = await prisma.user.findFirst({
      where: {
        name: assignment.name,
        role: 'MANAGER'
      },
      include: {
        managedObjects: {
          select: {
            name: true,
            address: true
          }
        }
      }
    });

    if (manager) {
      console.log(`👤 ${manager.name}:`);
      console.log(`   Назначено объектов: ${manager.managedObjects.length}`);
      manager.managedObjects.forEach((obj, i) => {
        console.log(`   ${i + 1}. ${obj.name}`);
      });
      console.log('');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
