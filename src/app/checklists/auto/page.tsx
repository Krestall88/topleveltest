import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import AutoChecklistManager from '@/components/AutoChecklistManager';

export default function AutoChecklistPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Suspense fallback={<div>Загрузка...</div>}>
          <AutoChecklistManager />
        </Suspense>
      </div>
    </AppLayout>
  );
}
