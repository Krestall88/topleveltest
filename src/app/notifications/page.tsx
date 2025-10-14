import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import NotificationsClientPage from './NotificationsClientPage';

export default async function NotificationsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Уведомления</h1>
          <p className="text-gray-600 mt-2">
            Управление уведомлениями и оповещениями системы
          </p>
        </div>

        <Suspense fallback={<div>Загрузка уведомлений...</div>}>
          <NotificationsClientPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
