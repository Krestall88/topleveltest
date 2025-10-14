import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import AuditClientPage from './AuditClientPage';

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return users;
  } catch (error) {
    console.error('Ошибка при загрузке пользователей:', error);
    return [];
  }
}

export default async function AuditPage() {
  const users = await getUsers();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">История действий</h1>
          <p className="text-gray-600 mt-2">
            Аудит лог всех операций и действий пользователей в системе
          </p>
        </div>

        <Suspense fallback={<div>Загрузка истории действий...</div>}>
          <AuditClientPage users={users} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
