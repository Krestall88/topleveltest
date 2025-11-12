import AppLayout from '@/components/AppLayout';
import RequestsClientPage from './RequestsClientPage';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RequestsPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Заявки</h1>
          <p className="text-gray-600 mt-2">
            Управление заявками от заказчиков и их обработка
          </p>
        </div>

        <RequestsClientPage initialRequests={[]} />
      </div>
    </AppLayout>
  );
}
