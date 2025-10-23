import { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import PhotoGalleryPage from '@/components/PhotoGalleryPage';

export const metadata: Metadata = {
  title: 'Фотоотчёты',
  description: 'Просмотр всех фотоотчётов из системы',
};

export default function PhotosPage() {
  return (
    <AppLayout>
      <PhotoGalleryPage />
    </AppLayout>
  );
}
