const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addSupervisorAndManagers() {
  try {
    console.log('Добавляем тестового руководителя и менеджеров...');

    // Создаем руководителя
    const hashedPasswordSupervisor = await bcrypt.hash('supervisor123', 10);
    const supervisor = await prisma.user.create({
      data: {
        name: 'Иван Петров',
        email: 'supervisor@cleaning.com',
        password: hashedPasswordSupervisor,
        role: 'SUPERVISOR',
      },
    });
    console.log('Создан руководитель:', supervisor.name);

    // Создаем менеджеров
    const managers = [
      {
        name: 'Анна Сидорова',
        email: 'anna@cleaning.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'MANAGER',
      },
      {
        name: 'Михаил Козлов',
        email: 'mikhail@cleaning.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'MANAGER',
      },
      {
        name: 'Елена Васильева',
        email: 'elena@cleaning.com',
        password: await bcrypt.hash('manager123', 10),
        role: 'MANAGER',
      },
    ];

    for (const managerData of managers) {
      const manager = await prisma.user.create({
        data: managerData,
      });
      console.log('Создан менеджер:', manager.name);
    }

    console.log('Все пользователи успешно созданы!');
    console.log('\nДанные для входа:');
    console.log('Руководитель: supervisor@cleaning.com / supervisor123');
    console.log('Менеджеры: anna@cleaning.com / manager123');
    console.log('          mikhail@cleaning.com / manager123');
    console.log('          elena@cleaning.com / manager123');

  } catch (error) {
    console.error('Ошибка при создании пользователей:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSupervisorAndManagers();
