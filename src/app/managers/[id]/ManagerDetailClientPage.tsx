'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Manager {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
  rooms: { id: string; name: string }[];
  _count: {
    checklists: number;
    requests: number;
    rooms: number;
  };
}

interface Checklist {
  id: string;
  date: string;
  object: { name: string };
  room: { name: string } | null;
  _count: { tasks: number };
}

interface Request {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  object: { name: string };
  creator: { name: string };
}

interface Expense {
  id: string;
  amount: number;
  quantity: number;
  createdAt: string;
  item: { name: string; unit: string };
  user: { name: string };
  task: {
    checklist: {
      object: { name: string };
      room: { name: string } | null;
    };
  };
}

interface PhotoReport {
  id: string;
  fileName: string;
  createdAt: string;
  object: { name: string };
  uploader: { name: string };
  task: {
    checklist: {
      room: { name: string } | null;
    };
  } | null;
}

interface ManagerData {
  manager: Manager;
  objects: CleaningObject[];
  checklists: Checklist[];
  requests: Request[];
  expenses: Expense[];
  photoReports: PhotoReport[];
  stats: {
    objects: number;
    checklists: number;
    requests: number;
    totalTasks: number;
    completedTasks: number;
    totalExpenses: number;
    photoReports: number;
    totalRooms: number;
  };
}

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
}

interface Props {
  managerId: string;
  user: User;
}

export default function ManagerDetailClientPage({ managerId, user }: Props) {
  const [data, setData] = useState<ManagerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchManagerData = async () => {
    try {
      const response = await fetch(`/api/managers/${managerId}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных менеджера');
      }
      const managerData = await response.json();
      setData(managerData);
    } catch (error) {
      console.error('Ошибка при загрузке данных менеджера:', error);
      setError('Не удалось загрузить данные менеджера');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, [managerId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'text-blue-600';
      case 'IN_PROGRESS': return 'text-yellow-600';
      case 'DONE': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'NEW': return 'Новая';
      case 'IN_PROGRESS': return 'В работе';
      case 'DONE': return 'Выполнена';
      case 'REJECTED': return 'Отклонена';
      default: return status;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка данных менеджера...</div>;
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">{error || 'Менеджер не найден'}</div>
        <Button onClick={() => window.history.back()}>
          ← Назад к списку менеджеров
        </Button>
      </div>
    );
  }

  const { manager, objects, checklists, requests, expenses, photoReports, stats } = data;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">👤 {manager.name}</h1>
          <p className="text-gray-600">{manager.email}</p>
          <p className="text-sm text-gray-500">Создан: {formatDate(manager.createdAt)}</p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          ← Назад к списку
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.objects}</div>
            <div className="text-sm text-gray-600">Объекты</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.totalRooms}</div>
            <div className="text-sm text-gray-600">Помещения</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.checklists}</div>
            <div className="text-sm text-gray-600">Чек-листы</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalTasks}</div>
            <div className="text-sm text-gray-600">Задания</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{stats.completedTasks}</div>
            <div className="text-sm text-gray-600">Выполнено</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.requests}</div>
            <div className="text-sm text-gray-600">Заявки</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-pink-600">{stats.photoReports}</div>
            <div className="text-sm text-gray-600">Фотоотчеты</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-orange-600">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <div className="text-sm text-gray-600">Расходы</div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная информация в табах */}
      <Tabs defaultValue="objects" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="objects">🏢 Объекты ({stats.objects})</TabsTrigger>
          <TabsTrigger value="checklists">✅ Чек-листы ({checklists.length})</TabsTrigger>
          <TabsTrigger value="requests">📋 Заявки ({requests.length})</TabsTrigger>
          <TabsTrigger value="expenses">💰 Расходы ({expenses.length})</TabsTrigger>
          <TabsTrigger value="photos">📷 Фото ({photoReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="objects" className="space-y-4">
          {objects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                У менеджера нет объектов
              </CardContent>
            </Card>
          ) : (
            objects.map((object) => (
              <Card key={object.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{object.name}</CardTitle>
                  <p className="text-sm text-gray-600">{object.address}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <div className="font-semibold text-green-600">{object._count.rooms}</div>
                      <div className="text-gray-600">Помещения</div>
                    </div>
                    <div>
                      <div className="font-semibold text-purple-600">{object._count.checklists}</div>
                      <div className="text-gray-600">Чек-листы</div>
                    </div>
                    <div>
                      <div className="font-semibold text-yellow-600">{object._count.requests}</div>
                      <div className="text-gray-600">Заявки</div>
                    </div>
                  </div>
                  {object.rooms.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Помещения:</div>
                      <div className="flex flex-wrap gap-2">
                        {object.rooms.map((room) => (
                          <span
                            key={room.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {room.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          {checklists.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Чек-листы не найдены
              </CardContent>
            </Card>
          ) : (
            checklists.map((checklist) => (
              <Card key={checklist.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{checklist.object.name}</div>
                      {checklist.room && (
                        <div className="text-sm text-gray-600">Помещение: {checklist.room.name}</div>
                      )}
                      <div className="text-sm text-gray-500">
                        Дата: {formatDate(checklist.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-purple-600">{checklist._count.tasks}</div>
                      <div className="text-sm text-gray-600">заданий</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Заявки не найдены
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{request.title}</div>
                      <div className="text-sm text-gray-600 mb-2">{request.description}</div>
                      <div className="text-sm text-gray-500">
                        Объект: {request.object.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Создал: {request.creator.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(request.createdAt)}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Расходы не найдены
              </CardContent>
            </Card>
          ) : (
            expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{expense.item.name}</div>
                      <div className="text-sm text-gray-600">
                        {expense.quantity} {expense.item.unit} × {formatCurrency(expense.amount / expense.quantity)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Объект: {expense.task.checklist.object.name}
                        {expense.task.checklist.room && ` → ${expense.task.checklist.room.name}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        Использовал: {expense.user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(expense.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-orange-600">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          {photoReports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Фотоотчеты не найдены
              </CardContent>
            </Card>
          ) : (
            photoReports.map((photo) => (
              <Card key={photo.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">📷 {photo.fileName}</div>
                      <div className="text-sm text-gray-600">
                        Объект: {photo.object.name}
                        {photo.task?.checklist.room && ` → ${photo.task.checklist.room.name}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        Загрузил: {photo.uploader.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(photo.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
