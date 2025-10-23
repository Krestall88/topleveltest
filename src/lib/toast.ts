import { toast as sonnerToast } from 'sonner';

// Обертка для toast уведомлений с использованием sonner
export const toast = {
  success: (message: string) => {
    sonnerToast.success(message);
  },
  
  error: (message: string) => {
    sonnerToast.error(message);
  },
  
  info: (message: string) => {
    sonnerToast.info(message);
  },
  
  warning: (message: string) => {
    sonnerToast.warning(message);
  },
  
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },
  
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  }
};
