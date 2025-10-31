import { Metadata } from 'next';
import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import PhotoGalleryPageNew from '@/components/PhotoGalleryPageNew';

export const metadata: Metadata = {
  title: 'Фотоотчёты',
  description: 'Просмотр всех фотоотчётов из системы',
};

export default function PhotosPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Загрузка фотоотчётов...</div>}>
        <PhotoGalleryPageNew />
      </Suspense>
    </AppLayout>
  );
}
