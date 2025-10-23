'use client';

import { Suspense } from 'react';

function ChooseObjectContent() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Выбор объекта</h1>
        <p className="text-gray-600">Страница выбора объекта для Telegram бота</p>
        <p className="text-sm text-gray-500 mt-2">Функционал временно упрощен для деплоя</p>
      </div>
    </div>
  );
}

export default function ChooseObjectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Загрузка...</div>
      </div>
    }>
      <ChooseObjectContent />
    </Suspense>
  );
}
