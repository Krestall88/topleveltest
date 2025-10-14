'use client';

import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import CompletionRequirementsManager from '@/components/CompletionRequirementsManager';

export default function CompletionSettingsPage() {
  const handleClose = () => {
    window.history.back();
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Настройки требований к завершению</h1>
            <p className="text-gray-600 mt-1">
              Массовая настройка требований к завершению чек-листов для объектов и помещений
            </p>
          </div>
        </div>
        
        <Suspense fallback={<div>Загрузка...</div>}>
          <CompletionRequirementsManager 
            isOpen={true}
            onClose={handleClose}
          />
        </Suspense>
      </div>
    </AppLayout>
  );
}
