import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import AdditionalTasksClientPage from './AdditionalTasksClientPage';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';

export default function AdditionalTasksPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Дополнительные задания</h1>
          <p className="text-gray-600 mt-2">
            Задания от заказчиков, поступившие через мессенджеры и email
          </p>
        </div>

        <Suspense fallback={<div>Загрузка заданий...</div>}>
          <AdditionalTasksClientPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
