'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Home, 
  FileText
} from 'lucide-react';

interface ObjectHierarchyTreeProps {
  objectId: string;
  onSelectTechTasks: (techTasks: TechTask[], context: string) => void;
}

interface HierarchyData {
  id: string;
  name: string;
  address: string;
  sites: Site[];
  directRooms: Room[];
  directTechCards: TechTask[];
}

interface Site {
  id: string;
  name: string;
  zones: Zone[];
  directRooms: Room[];
}

interface Zone {
  id: string;
  name: string;
  roomGroups: RoomGroup[];
  directRooms: Room[];
}

interface RoomGroup {
  id: string;
  name: string;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  area?: number;
  techCards: TechTask[];
  cleaningObjects?: CleaningObjectItem[];
}

interface CleaningObjectItem {
  id: string;
  name: string;
  techCards: TechTask[];
}

interface TechTask {
  id: string;
  name: string;
  workType?: string;
  frequency?: string;
  description?: string;
  notes?: string;
  period?: string;
}

export default function ObjectHierarchyTree({ objectId, onSelectTechTasks }: ObjectHierarchyTreeProps) {
  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHierarchy();
  }, [objectId]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      // Используем API hierarchy для получения полной структуры
      const response = await fetch(`/api/objects/${objectId}/hierarchy`);
      if (response.ok) {
        const objectData = await response.json();
        setData(objectData);
        
        // Автоматически показываем техзадания объекта при загрузке
        if (objectData.directTechCards?.length > 0) {
          onSelectTechTasks(objectData.directTechCards, `Объект: ${objectData.name}`);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки иерархии:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const handleSelectTechTasks = (techTasks: TechTask[], context: string) => {
    if (techTasks.length > 0) {
      onSelectTechTasks(techTasks, context);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Не удалось загрузить структуру объекта</p>
      </div>
    );
  }

  const renderCleaningObject = (cleaningObj: CleaningObjectItem, roomName: string) => (
    <div key={cleaningObj.id} className="ml-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSelectTechTasks(cleaningObj.techCards, `${roomName} → ${cleaningObj.name}`)}
        className="flex items-center gap-2 p-2 h-auto justify-start w-full hover:bg-orange-50"
      >
        <FileText className="h-4 w-4 text-orange-600" />
        <span className="font-medium text-sm">{cleaningObj.name}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          {cleaningObj.techCards.length}
        </Badge>
      </Button>
    </div>
  );

  const renderRoom = (room: Room, parentContext: string = '') => {
    const roomContext = parentContext ? `${parentContext} → ${room.name}` : room.name;
    const allTechTasks = [...(room.techCards || [])];
    room.cleaningObjects?.forEach(obj => allTechTasks.push(...obj.techCards));
    
    return (
      <div key={room.id} className="ml-4">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toggleRoom(room.id);
              if (allTechTasks.length > 0) {
                handleSelectTechTasks(allTechTasks, roomContext);
              }
            }}
            className="flex items-center gap-2 p-2 h-auto justify-start w-full hover:bg-green-50"
          >
            {((room.cleaningObjects?.length || 0) > 0 || (room.techCards?.length || 0) > 0) && (
              expandedRooms.has(room.id) ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
            )}
            <Home className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">{room.name}</span>
            {room.area && (
              <span className="text-xs text-gray-500">({room.area} м²)</span>
            )}
            <Badge variant="outline" className="ml-auto text-xs">
              {allTechTasks.length}
            </Badge>
          </Button>
        </div>
        
        {expandedRooms.has(room.id) && (
          <div className="ml-4 space-y-1">
            {/* Прямые техкарты помещения */}
            {room.techCards?.map(techCard => (
              <Button
                key={techCard.id}
                variant="ghost"
                size="sm"
                onClick={() => handleSelectTechTasks([techCard], `${roomContext} → ${techCard.name}`)}
                className="flex items-center gap-2 p-1 h-auto justify-start w-full text-xs text-blue-600 hover:bg-blue-50"
              >
                <FileText className="h-3 w-3" />
                <span>{techCard.name}</span>
                {techCard.frequency && (
                  <span className="text-gray-500">({techCard.frequency})</span>
                )}
              </Button>
            ))}
            
            {/* Объекты уборки */}
            {room.cleaningObjects?.map(obj => renderCleaningObject(obj, roomContext))}
          </div>
        )}
      </div>
    );
  };

  const renderRoomGroup = (roomGroup: RoomGroup, parentContext: string) => {
    const groupContext = `${parentContext} → ${roomGroup.name}`;
    
    return (
      <div key={roomGroup.id} className="ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleRoom(`group-${roomGroup.id}`)}
          className="flex items-center gap-2 p-2 h-auto justify-start w-full hover:bg-purple-50"
        >
          {expandedRooms.has(`group-${roomGroup.id}`) ? 
            <ChevronDown className="h-4 w-4" /> : 
            <ChevronRight className="h-4 w-4" />
          }
          <Home className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-sm">{roomGroup.name}</span>
        </Button>
        
        {expandedRooms.has(`group-${roomGroup.id}`) && (
          <div className="ml-4 space-y-1">
            {roomGroup.rooms?.map(room => renderRoom(room, groupContext))}
          </div>
        )}
      </div>
    );
  };

  const renderZone = (zone: Zone, parentContext: string) => {
    const zoneContext = `${parentContext} → ${zone.name}`;
    
    return (
      <div key={zone.id} className="ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleRoom(`zone-${zone.id}`)}
          className="flex items-center gap-2 p-2 h-auto justify-start w-full hover:bg-yellow-50"
        >
          {expandedRooms.has(`zone-${zone.id}`) ? 
            <ChevronDown className="h-4 w-4" /> : 
            <ChevronRight className="h-4 w-4" />
          }
          <Home className="h-4 w-4 text-yellow-600" />
          <span className="font-medium text-sm">{zone.name}</span>
        </Button>
        
        {expandedRooms.has(`zone-${zone.id}`) && (
          <div className="ml-4 space-y-1">
            {zone.roomGroups?.map(group => renderRoomGroup(group, zoneContext))}
            {zone.directRooms?.map(room => renderRoom(room, zoneContext))}
          </div>
        )}
      </div>
    );
  };

  const renderSite = (site: Site) => {
    const siteContext = site.name;
    
    return (
      <div key={site.id}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleRoom(`site-${site.id}`)}
          className="flex items-center gap-2 p-2 h-auto justify-start w-full hover:bg-blue-50"
        >
          {expandedRooms.has(`site-${site.id}`) ? 
            <ChevronDown className="h-4 w-4" /> : 
            <ChevronRight className="h-4 w-4" />
          }
          <Home className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm">{site.name}</span>
        </Button>
        
        {expandedRooms.has(`site-${site.id}`) && (
          <div className="ml-4 space-y-1">
            {site.zones?.map(zone => renderZone(zone, siteContext))}
            {site.directRooms?.map(room => renderRoom(room, siteContext))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto p-4">
      {/* Техзадания объекта */}
      {data.directTechCards?.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSelectTechTasks(data.directTechCards, `Объект: ${data.name}`)}
          className="flex items-center gap-2 p-2 h-auto justify-start w-full text-blue-600 hover:bg-blue-50 border-b mb-4"
        >
          <FileText className="h-4 w-4" />
          <span>📋 Техзадания объекта</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {data.directTechCards.length}
          </Badge>
        </Button>
      )}
      
      {/* Участки */}
      {data.sites?.map(renderSite)}
      
      {/* Прямые помещения объекта */}
      {data.directRooms?.length > 0 && (
        <div>
          <div className="font-medium text-gray-700 mb-2 flex items-center gap-2 text-sm border-t pt-2">
            <Home className="h-4 w-4" />
            Помещения объекта
          </div>
          {data.directRooms.map(room => renderRoom(room))}
        </div>
      )}
      
      {/* Если нет данных */}
      {(!data.sites || data.sites.length === 0) && 
       (!data.directRooms || data.directRooms.length === 0) && 
       (!data.directTechCards || data.directTechCards.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>Структура объекта пуста</p>
          <p className="text-sm">Добавьте участки, помещения и техзадания</p>
        </div>
      )}
    </div>
  );
}
