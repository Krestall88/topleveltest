'use client';

import { useParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import ObjectHierarchy from '@/components/ObjectHierarchy';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ObjectHierarchyPage() {
  const params = useParams();
  const objectId = params.id as string;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <Link href={`/objects/${objectId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к объекту
            </Button>
          </Link>
        </div>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Структура объекта</h1>
          <p className="text-gray-600">Полная иерархия участков, зон, помещений и техкарт</p>
        </div>

        <ObjectHierarchy objectId={objectId} />
      </div>
    </AppLayout>
  );
}
