import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import RequestsClientPage from './RequestsClientPage';

async function getRequests() {
  const requests = await prisma.request.findMany({
    include: {
      object: {
        select: { name: true, address: true }
      },
      creator: {
        select: { name: true, email: true }
      },
      photoReports: {
        select: { id: true, url: true, comment: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
  return requests;
}

export default async function RequestsPage() {
  const initialRequests = await getRequests();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Заявки</h1>
          <p className="text-gray-600 mt-2">
            Управление заявками от заказчиков и их обработка
          </p>
        </div>

        <Suspense fallback={<div>Загрузка заявок...</div>}>
          <RequestsClientPage initialRequests={initialRequests} />
        </Suspense>
      </div>
    </AppLayout>
  );
}
