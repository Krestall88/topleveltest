'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle, AlertCircle, Plus, MapPin, User, Calendar } from 'lucide-react';
import CreateRequestModal from '@/components/CreateRequestModal';

interface PhotoReport {
  id: string;
  url: string;
  comment?: string;
}

interface Request {
  id: string;
  title: string;
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
  source?: string;
  createdAt: string;
  updatedAt: string;
  object: {
    name: string;
    address: string;
  };
  creator: {
    name: string;
    email: string;
  };
  photoReports: PhotoReport[];
}

interface RequestsClientPageProps {
  initialRequests: Request[];
}

const statusConfig = {
  NEW: { label: 'Новая', icon: AlertCircle, color: 'text-orange-600 bg-orange-100' },
  IN_PROGRESS: { label: 'В работе', icon: Clock, color: 'text-blue-600 bg-blue-100' },
  DONE: { label: 'Выполнена', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  REJECTED: { label: 'Отклонена', icon: XCircle, color: 'text-red-600 bg-red-100' },
};

export default function RequestsClientPage({ initialRequests }: RequestsClientPageProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const updateRequestStatus = async (requestId: string, status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED') => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setRequests(prev => prev.map(req => 
          req.id === requestId ? updatedRequest : req
        ));
      }
    } catch (error) {
      console.error('Ошибка при обновлении заявки:', error);
    }
  };

  const createRequest = async (title: string, description: string, objectId: string) => {
    startTransition(async () => {
      try {
        // Получаем текущего пользователя
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) {
          alert('Необходимо авторизоваться для создания заявки');
          return;
        }
        
        const { user } = await userResponse.json();
        
        const response = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            objectId,
            creatorId: user.id,
            source: 'form'
          }),
        });

        if (response.ok) {
          const newRequest = await response.json();
          setRequests(prev => [newRequest, ...prev]);
          setIsCreateModalOpen(false);
          alert('Заявка успешно создана!');
        } else {
          const error = await response.json();
          alert(`Ошибка: ${error.message || 'Не удалось создать заявку'}`);
        }
      } catch (error) {
        console.error('Ошибка при создании заявки:', error);
        alert('Произошла ошибка при создании заявки');
      }
    });
  };

  const filteredRequests = requests.filter(request => 
    selectedStatus === 'all' || request.status === selectedStatus
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusCounts = () => {
    return {
      all: requests.length,
      NEW: requests.filter(r => r.status === 'NEW').length,
      IN_PROGRESS: requests.filter(r => r.status === 'IN_PROGRESS').length,
      DONE: requests.filter(r => r.status === 'DONE').length,
      REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Фильтры и статистика */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedStatus === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Все ({statusCounts.all})
          </button>
          {Object.entries(statusConfig).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                selectedStatus === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {config.label} ({statusCounts[status as keyof typeof statusCounts]})
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Создать заявку</span>
        </button>
      </div>

      {/* Список заявок */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => {
          const StatusIcon = statusConfig[request.status].icon;
          
          return (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{request.title}</CardTitle>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{request.object.name} - {request.object.address}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{request.creator.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Создана: {formatDate(request.createdAt)}</span>
                      </div>
                      {request.source && (
                        <div className="text-xs text-gray-500">
                          Источник: {request.source}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusConfig[request.status].color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusConfig[request.status].label}</span>
                    </div>
                    {request.photoReports.length > 0 && (
                      <div className="text-xs text-gray-500">
                        📷 {request.photoReports.length} фото
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{request.description}</p>
                
                {/* Действия */}
                <div className="flex space-x-2">
                  {request.status === 'NEW' && (
                    <button
                      onClick={() => updateRequestStatus(request.id, 'IN_PROGRESS')}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Взять в работу
                    </button>
                  )}
                  {request.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => updateRequestStatus(request.id, 'DONE')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Завершить
                      </button>
                      <button
                        onClick={() => updateRequestStatus(request.id, 'REJECTED')}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Отклонить
                      </button>
                    </>
                  )}
                  {(request.status === 'DONE' || request.status === 'REJECTED') && (
                    <button
                      onClick={() => updateRequestStatus(request.id, 'NEW')}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                    >
                      Переоткрыть
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет заявок</h3>
          <p className="text-gray-500">
            {selectedStatus === 'all' 
              ? 'Создайте первую заявку для начала работы' 
              : `Нет заявок со статусом "${statusConfig[selectedStatus as keyof typeof statusConfig]?.label}"`
            }
          </p>
        </div>
      )}

      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateRequest={createRequest}
        isPending={isPending}
      />
    </div>
  );
}
