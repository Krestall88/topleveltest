import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`Created admin user: `, admin);

  // Создаем тестовые объекты
  const existingGallery = await prisma.cleaningObject.findFirst({
    where: { name: 'Торговый центр "Галерея"' }
  });

  const gallery = existingGallery || await prisma.cleaningObject.create({
    data: {
      name: 'Торговый центр "Галерея"',
      address: 'ул. Ленина, 45',
      managerId: admin.id,
      creatorId: admin.id,
    },
  });

  const existingBusinessPark = await prisma.cleaningObject.findFirst({
    where: { name: 'Офисный центр "Бизнес-Парк"' }
  });

  const businessPark = existingBusinessPark || await prisma.cleaningObject.create({
    data: {
      name: 'Офисный центр "Бизнес-Парк"',
      address: 'пр. Мира, 123',
      managerId: admin.id,
      creatorId: admin.id,
    },
  });

  console.log(`Created objects: `, { gallery, businessPark });
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
