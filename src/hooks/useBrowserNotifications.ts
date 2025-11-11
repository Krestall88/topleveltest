'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  url?: string;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    // Проверяем поддержку браузером
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Запросить разрешение на показ уведомлений
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Browser notifications не поддерживаются');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Ошибка запроса разрешения на уведомления:', error);
      return 'denied';
    }
  }, [isSupported]);

  /**
   * Показать уведомление
   */
  const showNotification = useCallback((data: NotificationData): Notification | null => {
    if (!isSupported) {
      console.warn('Browser notifications не поддерживаются');
      return null;
    }

    if (permission !== 'granted') {
      console.warn('Нет разрешения на показ уведомлений');
      return null;
    }

    try {
      // Закрываем предыдущее уведомление с таким же tag
      if (notificationRef.current && data.tag) {
        notificationRef.current.close();
      }

      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.tag,
        data: data.data,
        requireInteraction: false, // Автоматически закроется через несколько секунд
        silent: false, // Со звуком
      });

      // Обработка клика по уведомлению
      if (data.url) {
        const url = data.url;
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          window.location.href = url;
          notification.close();
        };
      }

      // Автоматически закрыть через 10 секунд
      setTimeout(() => {
        notification.close();
      }, 10000);

      notificationRef.current = notification;
      return notification;
    } catch (error) {
      console.error('Ошибка показа уведомления:', error);
      return null;
    }
  }, [isSupported, permission]);

  /**
   * Проверить, нужно ли запрашивать разрешение
   */
  const shouldRequestPermission = useCallback((): boolean => {
    return isSupported && permission === 'default';
  }, [isSupported, permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    shouldRequestPermission,
  };
}
