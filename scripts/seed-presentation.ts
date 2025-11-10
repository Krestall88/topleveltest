import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/ru';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Хелпер для хеширования пароля
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Генерация случайной даты в диапазоне
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🚀 Начинаем создание тестовых данных для презентационной копии...\n');

  // Очищаем существующие данные (если есть)
  console.log('🧹 Очистка существующих данных...');
  await prisma.taskExecution.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskAdminComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.inventoryExpense.deleteMany();
  await prisma.expenseCategoryLimit.deleteMany();
  await prisma.inventoryLimit.deleteMany();
  await prisma.additionalTaskComment.deleteMany();
  await prisma.additionalTask.deleteMany();
  await prisma.reportingTaskAttachment.deleteMany();
  await prisma.reportingTask.deleteMany();
  await prisma.request.deleteMany();
  await prisma.photoReport.deleteMany();
  await prisma.techCard.deleteMany();
  await prisma.cleaningObjectItem.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomGroup.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.site.deleteMany();
  await prisma.deputyAdminAssignment.deleteMany();
  await prisma.excludedObject.deleteMany();
  await prisma.clientBinding.deleteMany();
  await prisma.objectStructure.deleteMany();
  await prisma.cleaningObject.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Очистка завершена\n');

  // 1. Создаем пользователей
  console.log('👥 Создание пользователей...');
  const hashedPassword = await hashPassword('password123');
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Администратор Системы',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '+7 (999) 123-45-67'
    }
  });

  const deputyAdmin = await prisma.user.create({
    data: {
      email: 'deputy@example.com',
      name: 'Заместитель Администратора',
      password: hashedPassword,
      role: 'DEPUTY_ADMIN',
      phone: '+7 (999) 234-56-78'
    }
  });

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@example.com',
      name: 'Бухгалтер Компании',
      password: hashedPassword,
      role: 'ACCOUNTANT',
      phone: '+7 (999) 345-67-89'
    }
  });

  const managers = await Promise.all(
    Array(4).fill(0).map((_, i) =>
      prisma.user.create({
        data: {
          email: `manager${i + 1}@example.com`,
          name: faker.person.fullName(),
          password: hashedPassword,
          role: 'MANAGER',
          phone: faker.phone.number('+7 (9##) ###-##-##')
        }
      })
    )
  );

  console.log(`✅ Создано пользователей: ${1 + 1 + 1 + managers.length}\n`);

  // 2. Создаем категории расходов
  console.log('📊 Создание категорий расходов...');
  const categories = await Promise.all([
    prisma.expenseCategory.create({
      data: {
        name: 'Химия и моющие средства',
        description: 'Моющие средства, дезинфекция, освежители',
        isActive: true,
        sortOrder: 1
      }
    }),
    prisma.expenseCategory.create({
      data: {
        name: 'Инвентарь и расходники',
        description: 'Швабры, ведра, тряпки, мешки для мусора',
        isActive: true,
        sortOrder: 2
      }
    }),
    prisma.expenseCategory.create({
      data: {
        name: 'Зарплата персонала',
        description: 'Заработная плата уборщиков',
        isActive: true,
        sortOrder: 3
      }
    }),
    prisma.expenseCategory.create({
      data: {
        name: 'Транспортные расходы',
        description: 'Проезд, доставка материалов',
        isActive: true,
        sortOrder: 4
      }
    }),
    prisma.expenseCategory.create({
      data: {
        name: 'Прочие расходы',
        description: 'Прочие операционные расходы',
        isActive: true,
        sortOrder: 5
      }
    })
  ]);
  console.log(`✅ Создано категорий: ${categories.length}\n`);

  // 3. Создаем объекты уборки
  console.log('🏢 Создание объектов уборки...');
  const objects = await Promise.all(
    Array(8).fill(0).map((_, i) =>
      prisma.cleaningObject.create({
        data: {
          name: `${faker.company.name()} - ${faker.location.street()}`,
          address: faker.location.streetAddress(true),
          creatorId: admin.id,
          managerId: managers[i % managers.length].id,
          workingDays: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ'],
          workingHours: {
            start: '08:00',
            end: '20:00'
          },
          totalArea: faker.number.int({ min: 100, max: 1000 }),
          autoChecklistEnabled: true,
          requirePhotoForCompletion: i % 2 === 0,
          description: `Объект ${i + 1} - ${faker.company.catchPhrase()}`,
          notes: faker.lorem.sentence()
        }
      })
    )
  );
  console.log(`✅ Создано объектов: ${objects.length}\n`);

  // 4. Назначаем объекты заместителю администратора
  console.log('🔗 Назначение объектов заместителю...');
  const deputyObjects = objects.slice(0, 3); // Первые 3 объекта
  await Promise.all(
    deputyObjects.map(obj =>
      prisma.deputyAdminAssignment.create({
        data: {
          deputyAdminId: deputyAdmin.id,
          objectId: obj.id,
          assignedById: admin.id
        }
      })
    )
  );
  console.log(`✅ Назначено объектов заместителю: ${deputyObjects.length}\n`);

  // 5. Создаем структуру для объектов (сайты, зоны, помещения)
  console.log('🏗️ Создание структуры объектов...');
  let totalRooms = 0;
  
  for (const obj of objects.slice(0, 4)) { // Для первых 4 объектов
    const site = await prisma.site.create({
      data: {
        name: `Корпус ${faker.number.int({ min: 1, max: 5 })}`,
        objectId: obj.id,
        managerId: obj.managerId,
        area: faker.number.int({ min: 200, max: 800 })
      }
    });

    const zone = await prisma.zone.create({
      data: {
        name: `Зона ${faker.location.cardinalDirection()}`,
        siteId: site.id,
        area: faker.number.int({ min: 100, max: 400 })
      }
    });

    const roomGroup = await prisma.roomGroup.create({
      data: {
        name: `Этаж ${faker.number.int({ min: 1, max: 10 })}`,
        zoneId: zone.id,
        area: faker.number.int({ min: 50, max: 200 })
      }
    });

    // Создаем помещения
    const rooms = await Promise.all(
      Array(3).fill(0).map((_, i) =>
        prisma.room.create({
          data: {
            name: `Помещение ${i + 1}`,
            objectId: obj.id,
            roomGroupId: roomGroup.id,
            area: faker.number.int({ min: 20, max: 100 }),
            description: faker.lorem.sentence()
          }
        })
      )
    );
    totalRooms += rooms.length;
  }
  console.log(`✅ Создано помещений: ${totalRooms}\n`);

  // 6. Создаем техкарты
  console.log('📋 Создание техкарт...');
  const techCardTemplates = [
    { name: 'Влажная уборка', workType: 'Уборка', frequency: 'Ежедневно' },
    { name: 'Мытье полов', workType: 'Уборка', frequency: 'Ежедневно' },
    { name: 'Протирка поверхностей', workType: 'Уборка', frequency: 'Ежедневно' },
    { name: 'Вынос мусора', workType: 'Уборка', frequency: 'Ежедневно' },
    { name: 'Мытье окон', workType: 'Уборка', frequency: 'Еженедельно' },
    { name: 'Генеральная уборка', workType: 'Уборка', frequency: 'Ежемесячно' }
  ];

  let totalTechCards = 0;
  for (const obj of objects) {
    const objRooms = await prisma.room.findMany({
      where: { objectId: obj.id },
      take: 2
    });

    for (const template of techCardTemplates) {
      await prisma.techCard.create({
        data: {
          name: template.name,
          workType: template.workType,
          frequency: template.frequency,
          objectId: obj.id,
          roomId: objRooms[0]?.id,
          description: `${template.name} - ${faker.lorem.sentence()}`,
          autoGenerate: true,
          isActive: true,
          frequencyDays: template.frequency === 'Ежедневно' ? 1 : template.frequency === 'Еженедельно' ? 7 : 30
        }
      });
      totalTechCards++;
    }
  }
  console.log(`✅ Создано техкарт: ${totalTechCards}\n`);

  // 7. Создаем лимиты по категориям
  console.log('💰 Создание лимитов расходов...');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  let totalLimits = 0;
  for (const obj of objects) {
    // Месячные лимиты
    for (const category of categories.slice(0, 3)) {
      await prisma.expenseCategoryLimit.create({
        data: {
          amount: faker.number.int({ min: 10000, max: 50000 }),
          periodType: 'MONTHLY',
          month: currentMonth,
          year: currentYear,
          objectId: obj.id,
          categoryId: category.id,
          setById: admin.id,
          isRecurring: true
        }
      });
      totalLimits++;
    }

    // Ежедневные лимиты
    await prisma.expenseCategoryLimit.create({
      data: {
        amount: faker.number.int({ min: 500, max: 2000 }),
        periodType: 'DAILY',
        objectId: obj.id,
        categoryId: categories[1].id, // Инвентарь
        setById: admin.id
      }
    });
    totalLimits++;

    // Годовой лимит
    await prisma.expenseCategoryLimit.create({
      data: {
        amount: faker.number.int({ min: 100000, max: 500000 }),
        periodType: 'ANNUAL',
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        objectId: obj.id,
        categoryId: categories[2].id, // Зарплата
        setById: admin.id
      }
    });
    totalLimits++;
  }
  console.log(`✅ Создано лимитов: ${totalLimits}\n`);

  // 8. Создаем расходы
  console.log('💸 Создание расходов...');
  let totalExpenses = 0;
  for (const obj of objects) {
    // Расходы за текущий месяц
    for (let i = 0; i < 10; i++) {
      await prisma.inventoryExpense.create({
        data: {
          amount: faker.number.int({ min: 500, max: 5000 }),
          description: faker.commerce.productDescription(),
          month: currentMonth,
          year: currentYear,
          objectId: obj.id,
          categoryId: categories[Math.floor(Math.random() * categories.length)].id,
          recordedById: obj.managerId || admin.id
        }
      });
      totalExpenses++;
    }

    // Расходы за прошлый месяц
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    for (let i = 0; i < 8; i++) {
      await prisma.inventoryExpense.create({
        data: {
          amount: faker.number.int({ min: 500, max: 5000 }),
          description: faker.commerce.productDescription(),
          month: lastMonth,
          year: lastMonthYear,
          objectId: obj.id,
          categoryId: categories[Math.floor(Math.random() * categories.length)].id,
          recordedById: obj.managerId || admin.id
        }
      });
      totalExpenses++;
    }
  }
  console.log(`✅ Создано расходов: ${totalExpenses}\n`);

  // 9. Создаем чеклисты и задачи
  console.log('✅ Создание чеклистов и задач...');
  let totalChecklists = 0;
  let totalTasks = 0;
  
  for (const obj of objects.slice(0, 5)) {
    const objRooms = await prisma.room.findMany({
      where: { objectId: obj.id }
    });

    // Создаем чеклисты за последние 7 дней
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);

      const checklist = await prisma.checklist.create({
        data: {
          date: date,
          objectId: obj.id,
          roomId: objRooms[0]?.id,
          creatorId: admin.id,
          completedAt: day < 5 ? date : null,
          completedById: day < 5 ? obj.managerId : null,
          name: `Чеклист ${date.toLocaleDateString('ru-RU')}`
        }
      });
      totalChecklists++;

      // Создаем задачи для чеклиста
      for (let i = 0; i < 3; i++) {
        await prisma.task.create({
          data: {
            description: faker.lorem.sentence(),
            status: day < 5 ? 'COMPLETED' : 'NEW',
            checklistId: checklist.id,
            roomId: objRooms[0]?.id,
            completedById: day < 5 ? obj.managerId : null,
            completedAt: day < 5 ? date : null
          }
        });
        totalTasks++;
      }
    }
  }
  console.log(`✅ Создано чеклистов: ${totalChecklists}`);
  console.log(`✅ Создано задач: ${totalTasks}\n`);

  // 10. Создаем выполнения задач (TaskExecution)
  console.log('📅 Создание выполнений задач...');
  let totalExecutions = 0;
  
  for (const obj of objects.slice(0, 4)) {
    const objTechCards = await prisma.techCard.findMany({
      where: { objectId: obj.id },
      take: 3
    });

    for (const techCard of objTechCards) {
      // Создаем выполнения за последние 7 дней
      for (let day = 0; day < 7; day++) {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() - day);
        
        const dueDate = new Date(scheduledDate);
        dueDate.setHours(dueDate.getHours() + 2);

        await prisma.taskExecution.create({
          data: {
            techCardId: techCard.id,
            objectId: obj.id,
            managerId: obj.managerId || managers[0].id,
            scheduledFor: scheduledDate,
            dueDate: dueDate,
            executedAt: day < 5 ? scheduledDate : null,
            status: day < 5 ? 'COMPLETED' : 'PENDING',
            comment: day < 5 ? 'Выполнено' : null
          }
        });
        totalExecutions++;
      }
    }
  }
  console.log(`✅ Создано выполнений: ${totalExecutions}\n`);

  // 11. Создаем дополнительные задачи
  console.log('📝 Создание дополнительных задач...');
  let totalAdditionalTasks = 0;
  
  for (const obj of objects.slice(0, 3)) {
    for (let i = 0; i < 3; i++) {
      await prisma.additionalTask.create({
        data: {
          title: faker.lorem.words(3),
          content: faker.lorem.paragraph(),
          source: 'Telegram',
          sourceDetails: {
            chatId: faker.number.int({ min: 100000, max: 999999 }),
            messageId: faker.number.int({ min: 1, max: 1000 })
          },
          status: i === 0 ? 'NEW' : i === 1 ? 'IN_PROGRESS' : 'COMPLETED',
          objectId: obj.id,
          assignedToId: obj.managerId || managers[0].id,
          completedById: i === 2 ? obj.managerId : null,
          completedAt: i === 2 ? new Date() : null,
          receivedAt: new Date()
        }
      });
      totalAdditionalTasks++;
    }
  }
  console.log(`✅ Создано дополнительных задач: ${totalAdditionalTasks}\n`);

  // Итоговая статистика
  console.log('═══════════════════════════════════════');
  console.log('✅ ТЕСТОВЫЕ ДАННЫЕ УСПЕШНО СОЗДАНЫ!');
  console.log('═══════════════════════════════════════');
  console.log(`\n📊 СТАТИСТИКА:`);
  console.log(`   👥 Пользователей: ${1 + 1 + 1 + managers.length}`);
  console.log(`   📊 Категорий расходов: ${categories.length}`);
  console.log(`   🏢 Объектов уборки: ${objects.length}`);
  console.log(`   🏗️ Помещений: ${totalRooms}`);
  console.log(`   📋 Техкарт: ${totalTechCards}`);
  console.log(`   💰 Лимитов: ${totalLimits}`);
  console.log(`   💸 Расходов: ${totalExpenses}`);
  console.log(`   ✅ Чеклистов: ${totalChecklists}`);
  console.log(`   📝 Задач: ${totalTasks}`);
  console.log(`   📅 Выполнений: ${totalExecutions}`);
  console.log(`   📝 Доп. задач: ${totalAdditionalTasks}`);
  console.log(`\n🔑 УЧЕТНЫЕ ЗАПИСИ:`);
  console.log(`   Администратор: admin@example.com / password123`);
  console.log(`   Заместитель: deputy@example.com / password123`);
  console.log(`   Бухгалтер: accountant@example.com / password123`);
  console.log(`   Менеджеры: manager1-4@example.com / password123`);
  console.log(`\n🎉 Готово! Можете запускать проект: npm run dev`);
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('\n❌ ОШИБКА при создании данных:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
