import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import ObjectsClientPage from './ObjectsClientPage';

export default function ObjectsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <div>
            <h1 className="text-2xl font-bold">🏢 Объекты</h1>
            <p className="text-gray-600 mt-1">Управление объектами клининга</p>
          </div>
        </div>
        
        <Suspense fallback={<div>Загрузка...</div>}>
          <ObjectsClientPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
