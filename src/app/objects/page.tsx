import { Suspense } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import ObjectsClientPage from './ObjectsClientPage';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function ObjectsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">🏢 Объекты</h1>
            <p className="text-gray-600 mt-1">Управление объектами клининга</p>
          </div>
          <div className="flex gap-2">
            <Link href="/objects/templates">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Шаблоны объектов
              </Button>
            </Link>
            <Link href="/objects/reporting-settings">
              <Button variant="outline">
                📋 Настройки отчетности
              </Button>
            </Link>
          </div>
        </div>
        
        <Suspense fallback={<div>Загрузка...</div>}>
          <ObjectsClientPage />
        </Suspense>
      </div>
    </AppLayout>
  );
}
