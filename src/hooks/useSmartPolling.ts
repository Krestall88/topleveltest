'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSmartPollingOptions {
  /** Интервал polling когда вкладка активна (мс) */
  activeInterval?: number;
  /** Интервал polling когда вкладка в фоне (мс) */
  backgroundInterval?: number;
  /** Время неактивности после которого polling останавливается (мс) */
  inactivityTimeout?: number;
  /** Включен ли polling */
  enabled?: boolean;
}

/**
 * Умный polling с адаптивным интервалом
 * 
 * Особенности:
 * - Замедляется когда вкладка в фоне
 * - Останавливается при долгой неактивности
 * - Автоматически возобновляется при возвращении
 * - Минимальная нагрузка на систему
 */
export function useSmartPolling(
  callback: () => void | Promise<void>,
  options: UseSmartPollingOptions = {}
) {
  const {
    activeInterval = 30000,      // 30 секунд когда активна
    backgroundInterval = 60000,   // 60 секунд в фоне
    inactivityTimeout = 300000,   // 5 минут неактивности
    enabled = true,
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);
  const callbackRef = useRef(callback);

  // Обновляем callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  /**
   * Запустить polling с указанным интервалом
   */
  const startPolling = useCallback((interval: number) => {
    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Запускаем новый интервал
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      // Останавливаем если долго неактивны
      if (timeSinceActivity > inactivityTimeout) {
        console.log('⏸️ Polling остановлен из-за неактивности');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      // Выполняем callback
      callbackRef.current();
    }, interval);
  }, [inactivityTimeout]);

  /**
   * Обновить время последней активности
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Возобновляем polling если был остановлен
    if (!intervalRef.current && enabled) {
      console.log('▶️ Polling возобновлен после активности');
      startPolling(isActiveRef.current ? activeInterval : backgroundInterval);
    }
  }, [enabled, activeInterval, backgroundInterval, startPolling]);

  /**
   * Обработка изменения видимости вкладки
   */
  const handleVisibilityChange = useCallback(() => {
    const isVisible = document.visibilityState === 'visible';
    isActiveRef.current = isVisible;

    if (isVisible) {
      console.log('👁️ Вкладка активна - ускоряем polling');
      updateActivity();
      startPolling(activeInterval);
    } else {
      console.log('👁️‍🗨️ Вкладка в фоне - замедляем polling');
      startPolling(backgroundInterval);
    }
  }, [activeInterval, backgroundInterval, startPolling, updateActivity]);

  // Инициализация
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Первый вызов сразу
    callbackRef.current();

    // Запускаем polling
    startPolling(activeInterval);

    // Слушаем изменение видимости вкладки
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Слушаем активность пользователя для обновления таймера
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [enabled, activeInterval, handleVisibilityChange, startPolling, updateActivity]);

  return {
    updateActivity,
    isActive: isActiveRef.current,
  };
}
