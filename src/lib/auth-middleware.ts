import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

export interface AuthUser {
  id: string;
  role: 'ADMIN' | 'DEPUTY_ADMIN' | 'MANAGER' | 'CLIENT' | 'ACCOUNTANT';
  name: string;
  email: string;
}

/**
 * Получение пользователя из JWT токена
 */
export async function getUserFromToken(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { 
        id: true, 
        role: true, 
        name: true, 
        email: true 
      }
    });

    if (!user || !user.name) return null;

    return {
      id: user.id,
      role: user.role as AuthUser['role'],
      name: user.name,
      email: user.email
    };
  } catch (error) {
    return null;
  }
}

/**
 * Проверка доступа менеджера к объекту
 */
export async function checkManagerAccess(managerId: string, objectId: string): Promise<boolean> {
  try {
    const object = await prisma.cleaningObject.findFirst({
      where: {
        id: objectId,
        managerId: managerId
      }
    });
    
    return !!object;
  } catch (error) {
    return false;
  }
}

/**
 * Проверка прав доступа к ресурсу
 */
export function checkPermission(
  userRole: AuthUser['role'], 
  requiredRole?: AuthUser['role'],
  isOwner?: boolean
): boolean {
  // Админ имеет доступ ко всему
  if (userRole === 'ADMIN') return true;
  
  // Заместитель имеет доступ почти ко всему (кроме системных настроек)
  if (userRole === 'DEPUTY_ADMIN' && requiredRole !== 'ADMIN') return true;
  
  // Менеджер имеет доступ только к своим ресурсам
  if (userRole === 'MANAGER') {
    if (requiredRole === 'ADMIN' || requiredRole === 'DEPUTY_ADMIN') return false;
    return isOwner !== false; // Если isOwner не указан, считаем что доступ есть
  }
  
  // Клиент имеет минимальные права
  if (userRole === 'CLIENT') {
    return requiredRole === 'CLIENT' || !requiredRole;
  }
  
  return false;
}

/**
 * Middleware для проверки авторизации
 */
export function requireAuth() {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json(
        { message: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Добавляем пользователя в заголовки для использования в API
    const response = NextResponse.next();
    response.headers.set('x-user-id', user.id);
    response.headers.set('x-user-role', user.role);
    
    return null; // Продолжаем выполнение
  };
}

/**
 * Middleware для проверки роли
 */
export function requireRole(requiredRole: AuthUser['role']) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json(
        { message: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    if (!checkPermission(user.role, requiredRole)) {
      return NextResponse.json(
        { message: 'Недостаточно прав доступа' }, 
        { status: 403 }
      );
    }
    
    return null;
  };
}

/**
 * Middleware для проверки доступа менеджера к объекту
 */
export function requireObjectAccess(getObjectId: (req: NextRequest) => string) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const user = await getUserFromToken(req);
    
    if (!user) {
      return NextResponse.json(
        { message: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Админ и заместитель имеют доступ ко всем объектам
    if (user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN') {
      return null;
    }
    
    // Для менеджеров проверяем доступ к конкретному объекту
    if (user.role === 'MANAGER') {
      const objectId = getObjectId(req);
      const hasAccess = await checkManagerAccess(user.id, objectId);
      
      if (!hasAccess) {
        return NextResponse.json(
          { message: 'Доступ к объекту запрещен' }, 
          { status: 403 }
        );
      }
    }
    
    return null;
  };
}

/**
 * Фильтрация объектов для менеджера
 */
export function getManagerObjectsFilter(user: AuthUser) {
  if (user.role === 'ADMIN' || user.role === 'DEPUTY_ADMIN') {
    return {}; // Без фильтра - видят все объекты
  }
  
  if (user.role === 'MANAGER') {
    return { managerId: user.id }; // Только свои объекты
  }
  
  return { id: 'never' }; // Клиенты не видят объекты
}

/**
 * Логирование действий пользователя
 */
export async function logUserAction(
  userId: string,
  action: string,
  details?: any,
  entityId?: string,
  entity: string = 'System'
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId || 'unknown',
        details: details ? JSON.stringify(details) : undefined
      }
    });
  } catch (error) {
    console.error('Ошибка логирования действия:', error);
  }
}
