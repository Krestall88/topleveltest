import { useEffect, useRef } from 'react';

/**
 * Хук для периодического опроса сервера
 * @param callback - Функция, которая будет вызываться с заданным интервалом
 * @param interval - Интервал в миллисекундах (по умолчанию 30 секунд)
 * @param enabled - Включен ли polling (по умолчанию true)
 */
export function useTaskPolling(
  callback: () => void | Promise<void>,
  interval: number = 30000,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback);

  // Сохраняем последний callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Настраиваем интервал
  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      try {
        await savedCallback.current();
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
