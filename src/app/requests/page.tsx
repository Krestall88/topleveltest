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

        {/* Инструкция для настройки доступа */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Настройка доступа к созданию заявок</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Для клиентов:</strong> Чтобы клиент мог создавать заявки, создайте пользователя с ролью <code className="bg-blue-100 px-1 rounded">CLIENT</code> через раздел "Пользователи".
            </p>
            <p>
              <strong>Для менеджеров:</strong> Менеджеры могут создавать заявки для своих объектов автоматически.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 <strong>Совет:</strong> В разделе "Пользователи" → "Создать пользователя" → выберите роль CLIENT и назначьте объекты, для которых клиент сможет создавать заявки.
            </p>
          </div>
        </div>

        <RequestsClientPage initialRequests={[]} />
      </div>
    </AppLayout>
  );
}
