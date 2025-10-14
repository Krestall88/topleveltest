'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TaskNotification {
  id: string;
  taskId: string;
  taskDescription: string;
  type: 'REMINDER' | 'OVERDUE' | 'UPCOMING' | 'DAILY' | 'WEEKLY';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledFor: string;
  objectName: string;
  roomName?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface TaskNotificationsProps {
  userId?: string;
  limit?: number;
  showAll?: boolean;
}

const notificationIcons = {
  REMINDER: <Bell className="w-4 h-4" />,
  OVERDUE: <AlertTriangle className="w-4 h-4" />,
  UPCOMING: <Clock className="w-4 h-4" />,
  DAILY: <Calendar className="w-4 h-4" />,
  WEEKLY: <Calendar className="w-4 h-4" />
};

const notificationColors = {
  REMINDER: 'bg-blue-100 text-blue-800',
  OVERDUE: 'bg-red-100 text-red-800',
  UPCOMING: 'bg-yellow-100 text-yellow-800',
  DAILY: 'bg-green-100 text-green-800',
  WEEKLY: 'bg-purple-100 text-purple-800'
};

const priorityColors = {
  LOW: 'border-l-gray-400',
  MEDIUM: 'border-l-blue-400',
  HIGH: 'border-l-orange-400',
  URGENT: 'border-l-red-500'
};

export default function TaskNotifications({ 
  userId, 
  limit = 10, 
  showAll = false 
}: TaskNotificationsProps) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (!showAll) params.append('limit', limit.toString());

      const response = await fetch(`/api/notifications/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Обновляем уведомления каждые 30 секунд
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId, limit, showAll]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/tasks/${notificationId}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/tasks/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Ошибка отметки всех уведомлений:', error);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'только что';
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ч назад`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} дн назад`;
  };

  const getScheduledTime = (scheduledFor: string) => {
    const date = new Date(scheduledFor);
    const now = new Date();
    
    if (date < now) {
      return `Просрочено на ${getTimeAgo(scheduledFor)}`;
    }
    
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `через ${diffInMinutes} мин`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `через ${diffInHours} ч`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `через ${diffInDays} дн`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Загрузка уведомлений...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Уведомления по задачам</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
            >
              Отметить все
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Нет уведомлений</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-l-4 rounded-lg cursor-pointer transition-colors ${
                  priorityColors[notification.priority]
                } ${
                  notification.isRead 
                    ? 'bg-gray-50 opacity-75' 
                    : 'bg-white shadow-sm hover:shadow-md'
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className={notificationColors[notification.type]}
                      >
                        {notificationIcons[notification.type]}
                        <span className="ml-1">
                          {notification.type === 'REMINDER' && 'Напоминание'}
                          {notification.type === 'OVERDUE' && 'Просрочено'}
                          {notification.type === 'UPCOMING' && 'Предстоящее'}
                          {notification.type === 'DAILY' && 'Ежедневно'}
                          {notification.type === 'WEEKLY' && 'Еженедельно'}
                        </span>
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1">
                      {notification.taskDescription}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>📍 {notification.objectName}</span>
                      {notification.roomName && (
                        <span>🏠 {notification.roomName}</span>
                      )}
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {getScheduledTime(notification.scheduledFor)}
                      </span>
                    </div>
                  </div>
                  
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
