import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import ChecklistsClientPage from './ChecklistsClientPage';

export default function ChecklistsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">✅ Чек-листы</h1>
        </div>
        
        <Suspense fallback={<div>Загрузка...</div>}>
          <ChecklistsClientPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
