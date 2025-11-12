import AppLayout from '@/components/AppLayout';
import AuditClientPage from './AuditClientPage';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AuditPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">История действий</h1>
          <p className="text-gray-600 mt-2">
            Аудит лог всех операций и действий пользователей в системе
          </p>
        </div>

        <AuditClientPage users={[]} />
      </div>
    </AppLayout>
  );
}
