import { prisma } from '@/lib/prisma';

interface User {
  id: string;
  role: string;
}

/**
 * Получает список объектов, доступных пользователю согласно его роли
 */
export async function getUserAccessibleObjects(user: User): Promise<string[]> {
  if (!user) return [];

  const { role, id: userId } = user;

  try {
    // Главный администратор видит все объекты
    if (role === 'ADMIN') {
      const allObjects = await prisma.cleaningObject.findMany({
        select: { id: true }
      });
      return allObjects.map(obj => obj.id);
    }

    // Заместитель администратора видит только назначенные объекты
    if (role === 'DEPUTY_ADMIN') {
      const assignments = await prisma.deputyAdminAssignment.findMany({
        where: { deputyAdminId: userId },
        select: { objectId: true }
      });
      return assignments.map(assignment => assignment.objectId);
    }

    // Менеджер видит только свои объекты
    if (role === 'MANAGER') {
      const managedObjects = await prisma.cleaningObject.findMany({
        where: { managerId: userId },
        select: { id: true }
      });
      return managedObjects.map(obj => obj.id);
    }

    // Бухгалтер и другие роли не имеют доступа к объектам
    return [];

  } catch (error) {
    console.error('Ошибка получения доступных объектов:', error);
    return [];
  }
}

/**
 * Создает условие WHERE для фильтрации по доступным объектам
 */
export async function createObjectAccessFilter(user: User, objectIdField: string = 'objectId') {
  const accessibleObjectIds = await getUserAccessibleObjects(user);
  
  if (accessibleObjectIds.length === 0) {
    // Если нет доступных объектов, возвращаем условие, которое ничего не найдет
    return { [objectIdField]: 'no-access' };
  }

  // Если пользователь имеет доступ ко всем объектам (ADMIN), не добавляем фильтр
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    [objectIdField]: {
      in: accessibleObjectIds
    }
  };
}

/**
 * Проверяет, имеет ли пользователь доступ к конкретному объекту
 */
export async function hasAccessToObject(user: User, objectId: string): Promise<boolean> {
  const accessibleObjectIds = await getUserAccessibleObjects(user);
  return accessibleObjectIds.includes(objectId);
}

/**
 * Получает информацию о пользователе с его доступными объектами
 */
export async function getUserWithAccessibleObjects(user: User) {
  const accessibleObjectIds = await getUserAccessibleObjects(user);
  
  const accessibleObjects = await prisma.cleaningObject.findMany({
    where: {
      id: { in: accessibleObjectIds }
    },
    select: {
      id: true,
      name: true,
      address: true
    },
    orderBy: { name: 'asc' }
  });

  return {
    ...user,
    accessibleObjects,
    accessibleObjectIds
  };
}
