'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  Building, 
  MapPin, 
  Home, 
  Package, 
  FileText,
  Users,
  Calendar
} from 'lucide-react';

interface ObjectHierarchyProps {
  objectId: string;
}

interface HierarchyData {
  id: string;
  name: string;
  address: string;
  manager?: {
    id: string;
    name: string;
    email: string;
  };
  sites: Site[];
  directRooms: Room[];
  directTechCards: TechCard[];
  stats: {
    rooms: number;
    techCards: number;
    checklists: number;
    requests: number;
    sites: number;
    zones: number;
    roomGroups: number;
    cleaningObjects: number;
  };
}

interface Site {
  id: string;
  name: string;
  description?: string;
  zones: Zone[];
}

interface Zone {
  id: string;
  name: string;
  description?: string;
  roomGroups: RoomGroup[];
}

interface RoomGroup {
  id: string;
  name: string;
  description?: string;
  rooms: Room[];
}

interface Room {
  id: string;
  name: string;
  description?: string;
  area?: number;
  cleaningObjects: CleaningObjectItem[];
  techCards: TechCard[];
}

interface CleaningObjectItem {
  id: string;
  name: string;
  description?: string;
  techCards: TechCard[];
}

interface TechCard {
  id: string;
  name: string;
  workType: string;
  frequency: string;
  description?: string;
  notes?: string;
  period?: string;
}

export default function ObjectHierarchy({ objectId }: ObjectHierarchyProps) {
  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHierarchy();
  }, [objectId]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/objects/${objectId}/hierarchy`);
      if (response.ok) {
        const hierarchyData = await response.json();
        setData(hierarchyData);
      }
    } catch (error) {
      console.error('Ошибка загрузки иерархии:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isExpanded = (itemId: string) => expandedItems.has(itemId);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Не удалось загрузить данные объекта</p>
        </CardContent>
      </Card>
    );
  }

  const renderTechCard = (techCard: TechCard) => (
    <div key={techCard.id} className="ml-6 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">{techCard.name}</span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Тип:</strong> {techCard.workType}</div>
            <div><strong>Периодичность:</strong> {techCard.frequency}</div>
            {techCard.period && <div><strong>Период:</strong> {techCard.period}</div>}
            {techCard.notes && <div><strong>Примечания:</strong> {techCard.notes}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCleaningObject = (cleaningObj: CleaningObjectItem) => (
    <div key={cleaningObj.id} className="ml-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleExpanded(`cleaning-${cleaningObj.id}`)}
        className="flex items-center gap-2 p-2 h-auto justify-start w-full"
      >
        {isExpanded(`cleaning-${cleaningObj.id}`) ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronRight className="h-4 w-4" />
        }
        <Package className="h-4 w-4 text-orange-600" />
        <span className="font-medium">{cleaningObj.name}</span>
        <Badge variant="outline" className="ml-auto">
          {cleaningObj.techCards.length} техкарт
        </Badge>
      </Button>
      
      {isExpanded(`cleaning-${cleaningObj.id}`) && (
        <div className="ml-4 space-y-2">
          {cleaningObj.techCards.map(renderTechCard)}
        </div>
      )}
    </div>
  );

  const renderRoom = (room: Room) => (
    <div key={room.id} className="ml-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleExpanded(`room-${room.id}`)}
        className="flex items-center gap-2 p-2 h-auto justify-start w-full"
      >
        {isExpanded(`room-${room.id}`) ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronRight className="h-4 w-4" />
        }
        <Home className="h-4 w-4 text-green-600" />
        <span className="font-medium">{room.name}</span>
        {room.area && <span className="text-sm text-gray-500">({room.area} м²)</span>}
        <Badge variant="outline" className="ml-auto">
          {room.cleaningObjects.length + room.techCards.length} элементов
        </Badge>
      </Button>
      
      {isExpanded(`room-${room.id}`) && (
        <div className="ml-4 space-y-2">
          {room.cleaningObjects.map(renderCleaningObject)}
          {room.techCards.map(renderTechCard)}
        </div>
      )}
    </div>
  );

  const renderRoomGroup = (roomGroup: RoomGroup) => (
    <div key={roomGroup.id} className="ml-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleExpanded(`group-${roomGroup.id}`)}
        className="flex items-center gap-2 p-2 h-auto justify-start w-full"
      >
        {isExpanded(`group-${roomGroup.id}`) ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronRight className="h-4 w-4" />
        }
        <Users className="h-4 w-4 text-purple-600" />
        <span className="font-medium">{roomGroup.name}</span>
        <Badge variant="outline" className="ml-auto">
          {roomGroup.rooms.length} помещений
        </Badge>
      </Button>
      
      {isExpanded(`group-${roomGroup.id}`) && (
        <div className="ml-4 space-y-2">
          {roomGroup.rooms.map(renderRoom)}
        </div>
      )}
    </div>
  );

  const renderZone = (zone: Zone) => (
    <div key={zone.id} className="ml-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleExpanded(`zone-${zone.id}`)}
        className="flex items-center gap-2 p-2 h-auto justify-start w-full"
      >
        {isExpanded(`zone-${zone.id}`) ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronRight className="h-4 w-4" />
        }
        <MapPin className="h-4 w-4 text-yellow-600" />
        <span className="font-medium">{zone.name}</span>
        <Badge variant="outline" className="ml-auto">
          {zone.roomGroups.length} групп
        </Badge>
      </Button>
      
      {isExpanded(`zone-${zone.id}`) && (
        <div className="ml-4 space-y-2">
          {zone.roomGroups.map(renderRoomGroup)}
        </div>
      )}
    </div>
  );

  const renderSite = (site: Site) => (
    <div key={site.id}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleExpanded(`site-${site.id}`)}
        className="flex items-center gap-2 p-2 h-auto justify-start w-full"
      >
        {isExpanded(`site-${site.id}`) ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronRight className="h-4 w-4" />
        }
        <Building className="h-4 w-4 text-blue-600" />
        <span className="font-medium">{site.name}</span>
        <Badge variant="outline" className="ml-auto">
          {site.zones.length} зон
        </Badge>
      </Button>
      
      {isExpanded(`site-${site.id}`) && (
        <div className="ml-4 space-y-2">
          {site.zones.map(renderZone)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Статистика объекта
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data.stats.sites}</div>
              <div className="text-sm text-gray-600">Участков</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data.stats.zones}</div>
              <div className="text-sm text-gray-600">Зон</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{data.stats.roomGroups}</div>
              <div className="text-sm text-gray-600">Групп помещений</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data.stats.rooms}</div>
              <div className="text-sm text-gray-600">Помещений</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{data.stats.cleaningObjects}</div>
              <div className="text-sm text-gray-600">Объектов уборки</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{data.stats.techCards}</div>
              <div className="text-sm text-gray-600">Техкарт</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{data.stats.checklists}</div>
              <div className="text-sm text-gray-600">Чек-листов</div>
            </div>
            <div className="text-center p-3 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{data.stats.requests}</div>
              <div className="text-sm text-gray-600">Заявок</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Иерархия */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Структура объекта: {data.name}
          </CardTitle>
          {data.manager && (
            <p className="text-sm text-gray-600">
              Менеджер: {data.manager.name} ({data.manager.email})
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Участки */}
            {data.sites.map(renderSite)}
            
            {/* Прямые помещения */}
            {data.directRooms.length > 0 && (
              <div>
                <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Помещения объекта
                </div>
                {data.directRooms.map(renderRoom)}
              </div>
            )}
            
            {/* Прямые техкарты */}
            {data.directTechCards.length > 0 && (
              <div>
                <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Техкарты объекта
                </div>
                {data.directTechCards.map(renderTechCard)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
