'use client';

import { Suspense } from 'react';
import MobileManagerInterface from '@/components/MobileManagerInterface';

export default function MobilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-8">Загрузка мобильного интерфейса...</div>
      </div>
    }>
      <MobileManagerInterface />
    </Suspense>
  );
}
