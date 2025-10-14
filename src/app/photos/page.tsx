import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import PhotosClientPage from './PhotosClientPage';

async function getPhotos() {
  try {
    const photos = await prisma.photoReport.findMany({
      include: {
        object: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        request: {
          select: {
            id: true,
            title: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          include: {
            checklist: {
              include: {
                object: { select: { name: true } },
                room: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return photos;
  } catch (error) {
    console.error('Ошибка при загрузке фотоотчётов:', error);
    return [];
  }
}

async function getObjects() {
  try {
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return objects;
  } catch (error) {
    console.error('Ошибка при загрузке объектов:', error);
    return [];
  }
}

export default async function PhotosPage() {
  const [photos, objects] = await Promise.all([
    getPhotos(),
    getObjects(),
  ]);

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
          <PhotosClientPage 
            initialPhotos={photos} 
            objects={objects}
          />
        </Suspense>
      </div>
    </AppLayout>
  );
}
