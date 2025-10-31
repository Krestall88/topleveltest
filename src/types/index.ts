// Общие типы для системы клининг-контроля

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DEPUTY' | 'DEPUTY_ADMIN' | 'MANAGER' | 'ACCOUNTANT';
  createdAt: string;
  updatedAt: string;
}

export interface CleaningObject {
  id: string;
  name: string;
  address: string;
  managerId?: string;
  manager?: User;
  createdAt: string;
  updatedAt: string;
}

export interface AdditionalTask {
  id: string;
  title: string;
  content: string;
  source: 'TELEGRAM' | 'EMAIL' | 'MANUAL';
  sourceDetails?: Record<string, unknown>;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
  objectId: string;
  object?: CleaningObject;
  assignedToId?: string;
  assignedTo?: User;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  receivedAt?: string;
  attachments?: string[];
  completionComment?: string;
  takenAt?: string;
  completedBy?: User;
  completionNote?: string;
  completionPhotos?: string[];
  comments?: AdditionalTaskComment[];
}

export interface AdditionalTaskComment {
  id: string;
  createdAt: string;
  taskId: string;
  userId: string;
  user?: User;
  content: string;
  isAdmin: boolean;
}

export interface InventoryBalance {
  id: string;
  objectId: string;
  objectName: string;
  month: number;
  year: number;
  limit: number;
  spent: number;
  balance: number;
  isOverBudget: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Типы для форм
export interface FormData {
  [key: string]: string | number | boolean | File | null | undefined;
}

// Типы для фильтров
export interface FilterOptions {
  [key: string]: string | number | boolean | string[] | undefined;
}
