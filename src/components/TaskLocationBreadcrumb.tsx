'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Home, 
  MapPin, 
  Layers,
  ChevronRight 
} from 'lucide-react';

interface TaskLocationProps {
  task: {
    id: string;
    description: string;
    objectName?: string;
    roomName?: string;
    checklist?: {
      object?: {
        id: string;
        name: string;
        address?: string;
      };
      room?: {
        id: string;
        name: string;
        area?: number;
      };
    };
    // Для новой системы TaskExecution
    techCard?: {
      id: string;
      name: string;
      description?: string;
      frequency?: string;
    };
    // Полная иерархия
    object?: any;
    room?: any;
    site?: {
      id: string;
      name: string;
    };
    zone?: {
      id: string;
      name: string;
    };
    roomGroup?: {
      id: string;
      name: string;
    };
    cleaningObjectItem?: {
      id: string;
      name: string;
    };
  };
  showFullPath?: boolean;
  compact?: boolean;
}

export default function TaskLocationBreadcrumb({ 
  task, 
  showFullPath = true, 
  compact = false 
}: TaskLocationProps) {
  
  // Определяем данные объекта
  const objectData = task.checklist?.object || {
    id: 'unknown',
    name: task.objectName || 'Неизвестный объект'
  };

  // Определяем данные полной иерархии
  const siteData = {
    name: task.site?.name || 'Неизвестный участок'
  };

  const zoneData = {
    name: task.zone?.name || 'Неизвестная зона'
  };

  const roomGroupData = {
    name: task.roomGroup?.name || 'Неизвестная группа помещений'
  };

  const roomData = task.checklist?.room || task.room || {
    id: 'unknown',
    name: task.roomName || 'Неизвестное помещение'
  };

  const cleaningObjectItemData = {
    name: task.cleaningObjectItem?.name || null
  };

  // Логируем данные для отладки
  console.log('TaskLocationBreadcrumb data:', {
    taskId: task.id,
    description: task.description,
    objectName: task.objectName,
    roomName: task.roomName,
    checklistObject: task.checklist?.object?.name,
    checklistRoom: task.checklist?.room?.name,
    techCardName: task.techCard?.name,
    objectData: objectData,
    roomData: roomData
  });

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <Building2 className="h-3 w-3" />
        <span className="truncate max-w-32">{objectData.name}</span>
        {roomData.name && roomData.name !== 'Неизвестное помещение' && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Home className="h-3 w-3" />
            <span className="truncate max-w-24">{roomData.name}</span>
          </>
        )}
      </div>
    );
  }

  if (!showFullPath) {
    return (
      <div className="space-y-1 p-2 bg-blue-50 rounded border">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {objectData.name}
          </Badge>
          {roomData.name && roomData.name !== 'Неизвестное помещение' && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {roomData.name}
              {roomData.area && (
                <span className="text-xs text-gray-500">({roomData.area} м²)</span>
              )}
            </Badge>
          )}
        </div>
        
        {/* Визуальный путь навигации с полной иерархией */}
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Building2 className="h-3 w-3 text-blue-600" />
          <span className="truncate max-w-32 font-medium">{objectData.name}</span>
          
          {/* Участок */}
          {(task as any).site?.name && (task as any).site.name !== 'Неизвестный участок' && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <div className="h-3 w-3 bg-green-600 rounded-sm"></div>
              <span className="truncate max-w-20 text-green-700">{(task as any).site.name}</span>
            </>
          )}
          
          {/* Зона */}
          {(task as any).zone?.name && (task as any).zone.name !== 'Неизвестная зона' && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <div className="h-3 w-3 bg-yellow-600 rounded-sm"></div>
              <span className="truncate max-w-20 text-yellow-700">{(task as any).zone.name}</span>
            </>
          )}
          
          {/* Помещение */}
          {roomData.name && roomData.name !== 'Неизвестное помещение' && (
            <>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <Home className="h-3 w-3 text-purple-600" />
              <span className="truncate max-w-24 text-purple-700">{roomData.name}</span>
            </>
          )}
          
          <ChevronRight className="h-3 w-3 text-gray-400" />
          <Layers className="h-3 w-3 text-orange-600" />
          <span className="font-medium truncate max-w-32 text-orange-700">
            {task.techCard?.name || task.description || 'Техзадание'}
          </span>
        </div>
        
        {/* Отладочная информация */}
        <div className="text-xs text-gray-500 border-t pt-1">
          Объект: {objectData.name} | Помещение: {roomData.name}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
      {/* Заголовок */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <MapPin className="h-4 w-4 text-blue-600" />
        <span>Местоположение выполнения работ</span>
      </div>

      {/* Полная иерархия */}
      <div className="space-y-3 max-w-none overflow-visible">
        {/* Объект */}
        <div className="flex items-start gap-2 text-sm">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-gray-700">Объект:</span>
          </div>
          <span className="text-gray-900 font-medium break-words">{objectData.name}</span>
        </div>

        {/* Адрес */}
        {objectData.address && (
          <div className="flex items-start gap-2 text-sm">
            <div className="flex items-center gap-1 flex-shrink-0">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-medium text-gray-700">Адрес:</span>
            </div>
            <span className="text-gray-600 break-words">{objectData.address}</span>
          </div>
        )}

        {/* Участок */}
        {siteData.name && siteData.name !== 'Неизвестный участок' && (
          <div className="flex items-start gap-2 text-sm">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="h-4 w-4 bg-green-600 rounded-sm"></div>
              <span className="font-medium text-gray-700">Участок:</span>
            </div>
            <span className="text-gray-900 break-words">{siteData.name}</span>
          </div>
        )}

        {/* Зона */}
        {zoneData.name && zoneData.name !== 'Неизвестная зона' && (
          <div className="flex items-start gap-2 text-sm">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="h-4 w-4 bg-yellow-600 rounded-sm"></div>
              <span className="font-medium text-gray-700">Зона:</span>
            </div>
            <span className="text-gray-900 break-words">{zoneData.name}</span>
          </div>
        )}

        {/* Группа помещений */}
        {roomGroupData.name && roomGroupData.name !== 'Неизвестная группа помещений' && (
          <div className="flex items-start gap-2 text-sm">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="h-4 w-4 bg-indigo-600 rounded-sm"></div>
              <span className="font-medium text-gray-700">Группа помещений:</span>
            </div>
            <span className="text-gray-900 break-words">{roomGroupData.name}</span>
          </div>
        )}

        {/* Помещение */}
        {roomData.name && roomData.name !== 'Неизвестное помещение' && (
          <div className="flex items-start gap-2 text-sm">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Home className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-700">Помещение:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-900 break-words">{roomData.name}</span>
              {roomData.area && (
                <Badge variant="secondary" className="text-xs">
                  {roomData.area} м²
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Объект уборки */}
        {cleaningObjectItemData.name && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-gray-700">Объект уборки:</span>
            </div>
            <span className="text-gray-900">{cleaningObjectItemData.name}</span>
          </div>
        )}
      </div>

      {/* Визуальный путь навигации */}
      <div className="flex items-center gap-1 text-xs bg-white p-2 rounded-lg border overflow-x-auto">
        <Building2 className="h-3 w-3 text-blue-600 flex-shrink-0" />
        <span className="text-gray-700 font-medium flex-shrink-0">{objectData.name}</span>
        
        {siteData.name && siteData.name !== 'Неизвестный участок' && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <div className="h-3 w-3 bg-green-600 rounded-sm flex-shrink-0"></div>
            <span className="text-green-700 flex-shrink-0">{siteData.name}</span>
          </>
        )}
        
        {zoneData.name && zoneData.name !== 'Неизвестная зона' && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <div className="h-3 w-3 bg-yellow-600 rounded-sm flex-shrink-0"></div>
            <span className="text-yellow-700 flex-shrink-0">{zoneData.name}</span>
          </>
        )}

        {roomGroupData.name && roomGroupData.name !== 'Неизвестная группа помещений' && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <div className="h-3 w-3 bg-indigo-600 rounded-sm flex-shrink-0"></div>
            <span className="text-indigo-700 flex-shrink-0">{roomGroupData.name}</span>
          </>
        )}
        
        {roomData.name && roomData.name !== 'Неизвестное помещение' && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <Home className="h-3 w-3 text-purple-600 flex-shrink-0" />
            <span className="text-purple-700 flex-shrink-0">{roomData.name}</span>
          </>
        )}

        {cleaningObjectItemData.name && (
          <>
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <Layers className="h-3 w-3 text-orange-600 flex-shrink-0" />
            <span className="text-orange-700 flex-shrink-0">{cleaningObjectItemData.name}</span>
          </>
        )}
        
        <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <div className="h-3 w-3 bg-red-600 rounded-sm flex-shrink-0"></div>
        <span className="text-red-700 font-medium flex-shrink-0">
          {task.techCard?.name || task.description || 'Техзадание'}
        </span>
      </div>
    </div>
  );
}

// Утилита для извлечения краткой информации о местоположении
export function getTaskLocationSummary(task: any): string {
  const objectData = {
    name: task.objectName || task.checklist?.object?.name || 'Неизвестный объект',
    address: task.checklist?.object?.address || ''
  };

  const siteData = {
    name: task.site?.name || 'Неизвестный участок'
  };

  const zoneData = {
    name: task.zone?.name || 'Неизвестная зона'
  };

  const roomData = {
    name: task.room?.name || task.roomName || task.checklist?.room?.name || 'Неизвестное помещение',
    area: task.room?.area || task.checklist?.room?.area || null
  };
  
  if (roomData.name && roomData.name !== 'Неизвестное помещение') {
    return `${objectData.name} → ${siteData.name} → ${zoneData.name} → ${roomData.name}`;
  }
  
  return objectData.name;
}

// Утилита для получения полного пути
export function getTaskLocationFullPath(task: any): {
  object: string;
  room?: string;
  area?: number;
  address?: string;
} {
  const objectData = task.checklist?.object || {};
  const roomData = task.checklist?.room || {};
  
  return {
    object: objectData.name || task.objectName || 'Неизвестный объект',
    room: roomData.name && roomData.name !== 'Неизвестное помещение' ? roomData.name : undefined,
    area: roomData.area,
    address: objectData.address
  };
}
