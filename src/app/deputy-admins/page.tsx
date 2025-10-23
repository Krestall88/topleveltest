'use client';

import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import DeputyAdminManager from '@/components/DeputyAdminManager';

export default function DeputyAdminsPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8">Загрузка управления заместителями администраторов...</div>}>
        <DeputyAdminManager />
      </Suspense>
    </AppLayout>
  );
}
