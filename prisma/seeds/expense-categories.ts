import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedExpenseCategories() {
  console.log('🌱 Seeding expense categories...');

  const categories = [
    {
      name: 'Химия,инвентарь,расходники',
      description: 'Моющие средства, чистящие средства, инвентарь для уборки',
      sortOrder: 1
    },
    {
      name: 'Тележки',
      description: 'Уборочные тележки и аксессуары',
      sortOrder: 2
    },
    {
      name: 'Спецодежда',
      description: 'Рабочая одежда, средства индивидуальной защиты',
      sortOrder: 3
    },
    {
      name: 'Покупка оборудования',
      description: 'Закупка нового оборудования для уборки',
      sortOrder: 4
    },
    {
      name: 'Ремонт оборудования',
      description: 'Ремонт и обслуживание оборудования',
      sortOrder: 5
    },
    {
      name: 'Медицинские книжки',
      description: 'Оформление медицинских книжек для сотрудников',
      sortOrder: 6
    },
    {
      name: 'ГСМ',
      description: 'Горюче-смазочные материалы',
      sortOrder: 7
    },
    {
      name: 'Вызов техники в зимний период',
      description: 'Снегоуборочная техника, услуги по уборке снега',
      sortOrder: 8
    },
    {
      name: 'Реагенты',
      description: 'Противогололедные реагенты',
      sortOrder: 9
    },
    {
      name: 'Диспенсеры',
      description: 'Диспенсеры для мыла, бумаги и других расходников',
      sortOrder: 10
    }
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category
    });
  }

  console.log('✅ Expense categories seeded successfully');
}

// Если запускается напрямую
if (require.main === module) {
  seedExpenseCategories()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
