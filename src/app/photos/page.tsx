import { Metadata } from 'next';
import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import PhotoGalleryPage from '@/components/PhotoGalleryPage';

export const metadata: Metadata = {
  title: 'Фотоотчёты',
  description: 'Просмотр всех фотоотчётов из системы',
};

export default function PhotosPage() {
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Фотоотчёты</h1>
          <p className="text-gray-600 mt-2">
            Загрузка и управление фотоотчётами по объектам, чек-листам и заявкам
          </p>
        </div>

        <Suspense fallback={<div>Загрузка фотоотчётов...</div>}>
          <PhotoGalleryPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
