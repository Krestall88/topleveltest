import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import ObjectDetailClientPage from './ObjectDetailClientPage';

export default function ObjectDetailPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Suspense fallback={<div>Загрузка...</div>}>
          <ObjectDetailClientPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
