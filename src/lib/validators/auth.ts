import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Требуется указать корректный email' }),
  password: z.string().min(6, { message: 'Пароль должен содержать минимум 6 символов' }),
});
