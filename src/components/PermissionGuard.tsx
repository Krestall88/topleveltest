'use client';

import { ReactNode } from 'react';
import { checkPermission, AuthUser } from '@/lib/auth-middleware';

interface PermissionGuardProps {
  user: AuthUser;
  requiredRole?: AuthUser['role'];
  isOwner?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Компонент для проверки прав доступа на уровне UI
 */
export function PermissionGuard({ 
  user, 
  requiredRole, 
  isOwner, 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const hasPermission = checkPermission(user.role, requiredRole, isOwner);
  
  if (!hasPermission) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Хук для проверки прав доступа
 */
export function usePermissions(user: AuthUser) {
  return {
    isAdmin: user.role === 'ADMIN',
    isDeputy: user.role === 'DEPUTY',
    isManager: user.role === 'MANAGER',
    isClient: user.role === 'CLIENT',
    
    canManageUsers: user.role === 'ADMIN' || user.role === 'DEPUTY',
    canManageObjects: user.role === 'ADMIN' || user.role === 'DEPUTY',
    canViewAllObjects: user.role === 'ADMIN' || user.role === 'DEPUTY',
    canEditTechCards: user.role === 'ADMIN' || user.role === 'DEPUTY',
    canViewAnalytics: user.role === 'ADMIN' || user.role === 'DEPUTY',
    
    canExecuteTasks: user.role === 'MANAGER',
    canManageInventory: user.role === 'MANAGER',
    canCreateReports: user.role === 'MANAGER',
    
    checkObjectAccess: (objectManagerId: string) => {
      if (user.role === 'ADMIN' || user.role === 'DEPUTY') return true;
      if (user.role === 'MANAGER') return user.id === objectManagerId;
      return false;
    }
  };
}

/**
 * Компонент для отображения сообщения о недостатке прав
 */
export function AccessDenied({ message = 'У вас недостаточно прав для просмотра этой страницы' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Компонент для условного рендеринга на основе ролей
 */
interface RoleBasedProps {
  user: AuthUser;
  allowedRoles: AuthUser['role'][];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleBased({ user, allowedRoles, fallback = null, children }: RoleBasedProps) {
  const hasAccess = allowedRoles.includes(user.role);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Компонент для проверки доступа к объекту
 */
interface ObjectAccessProps {
  user: AuthUser;
  objectManagerId: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function ObjectAccess({ user, objectManagerId, fallback = null, children }: ObjectAccessProps) {
  const hasAccess = user.role === 'ADMIN' || 
                   user.role === 'DEPUTY' || 
                   (user.role === 'MANAGER' && user.id === objectManagerId);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
