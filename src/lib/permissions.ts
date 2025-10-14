import { prisma } from '@/lib/prisma';

export type UserRole = 'ADMIN' | 'DEPUTY_ADMIN' | 'DEPUTY' | 'MANAGER' | 'CLIENT';

export interface UserSession {
  id: string;
  role: UserRole;
  email: string;
  name?: string;
}

/**
 * Проверяет, имеет ли пользователь доступ к объекту
 */
export async function hasObjectAccess(userId: string, userRole: UserRole, objectId: string): Promise<boolean> {
  // Главный админ и заместитель имеют доступ ко всем объектам
  if (userRole === 'ADMIN' || userRole === 'DEPUTY') {
    return true;
  }

  // Заместитель администратора имеет доступ только к назначенным объектам
  if (userRole === 'DEPUTY_ADMIN') {
    try {
      const assignment = await (prisma as any).deputyAdminAssignment.findFirst({
        where: {
          deputyAdminId: userId,
          objectId: objectId,
        }
      });
      return !!assignment;
    } catch (error) {
      console.error('Ошибка при проверке назначений DEPUTY_ADMIN:', error);
      return false;
    }
  }

  // Менеджер имеет доступ только к своим объектам
  if (userRole === 'MANAGER') {
    const object = await prisma.cleaningObject.findFirst({
      where: {
        id: objectId,
        managerId: userId,
      }
    });
    return !!object;
  }

  // Клиент не имеет прямого доступа к объектам
  return false;
}

/**
 * Получает список объектов, к которым пользователь имеет доступ
 */
export async function getUserAccessibleObjects(userId: string, userRole: UserRole): Promise<string[]> {
  // Главный админ и заместитель имеют доступ ко всем объектам
  if (userRole === 'ADMIN' || userRole === 'DEPUTY') {
    const objects = await prisma.cleaningObject.findMany({
      select: { id: true }
    });
    return objects.map(obj => obj.id);
  }

  // Заместитель администратора имеет доступ только к назначенным объектам
  if (userRole === 'DEPUTY_ADMIN') {
    try {
      const assignments = await (prisma as any).deputyAdminAssignment.findMany({
        where: { deputyAdminId: userId },
        select: { objectId: true }
      });
      return assignments.map((assignment: any) => assignment.objectId);
    } catch (error) {
      console.error('Ошибка при получении назначений DEPUTY_ADMIN:', error);
      return [];
    }
  }

  // Менеджер имеет доступ только к своим объектам
  if (userRole === 'MANAGER') {
    const objects = await prisma.cleaningObject.findMany({
      where: { managerId: userId },
      select: { id: true }
    });
    return objects.map(obj => obj.id);
  }

  // Клиент не имеет прямого доступа к объектам
  return [];
}

/**
 * Проверяет, может ли пользователь управлять другим пользователем
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // Главный админ может управлять всеми
  if (managerRole === 'ADMIN') {
    return true;
  }

  // Заместитель может управлять менеджерами и клиентами
  if (managerRole === 'DEPUTY') {
    return ['MANAGER', 'CLIENT'].includes(targetRole);
  }

  // Заместитель администратора может управлять менеджерами и клиентами только на своих объектах
  if (managerRole === 'DEPUTY_ADMIN') {
    return ['MANAGER', 'CLIENT'].includes(targetRole);
  }

  // Менеджер не может управлять другими пользователями
  return false;
}

/**
 * Проверяет, может ли пользователь создавать объекты
 */
export function canCreateObjects(userRole: UserRole): boolean {
  return ['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(userRole);
}

/**
 * Проверяет, может ли пользователь управлять инвентарем объекта
 */
export async function canManageInventory(userId: string, userRole: UserRole, objectId: string): Promise<boolean> {
  return await hasObjectAccess(userId, userRole, objectId);
}

/**
 * Проверяет, может ли пользователь просматривать аналитику
 */
export function canViewAnalytics(userRole: UserRole): boolean {
  return ['ADMIN', 'DEPUTY', 'DEPUTY_ADMIN'].includes(userRole);
}

/**
 * Проверяет, может ли пользователь назначать заместителей администраторов
 */
export function canAssignDeputyAdmins(userRole: UserRole): boolean {
  return userRole === 'ADMIN';
}

/**
 * Проверяет, может ли пользователь изменять настройки объекта (включая обязательность фото)
 */
export async function canModifyObjectSettings(userId: string, userRole: UserRole, objectId: string): Promise<boolean> {
  // Главный админ может изменять настройки всех объектов
  if (userRole === 'ADMIN') {
    return true;
  }

  // Заместитель может изменять настройки всех объектов
  if (userRole === 'DEPUTY') {
    return true;
  }

  // Заместитель администратора может изменять настройки только назначенных объектов
  if (userRole === 'DEPUTY_ADMIN') {
    return await hasObjectAccess(userId, userRole, objectId);
  }

  // Менеджер не может изменять настройки объектов
  return false;
}
