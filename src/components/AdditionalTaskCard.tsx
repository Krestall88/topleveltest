'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Building, 
  User, 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText,
  Image,
  Mic,
  CheckCircle,
  PlayCircle,
  Calendar,
  Trash2
} from 'lucide-react';

interface AdditionalTask {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceDetails: any;
  attachments: string[];
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
  receivedAt: string;
  takenAt?: string;
  completedAt?: string;
  completionNote?: string;
  object: {
    id: string;
    name: string;
    address: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  completedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AdditionalTaskCardProps {
  task: AdditionalTask;
  onStatusChange?: (taskId: string, action: 'take' | 'complete', note?: string) => void;
  onDelete?: (taskId: string) => void;
  showActions?: boolean;
  isCurrentUser?: boolean;
  canDelete?: boolean;
}

const statusConfig = {
  NEW: { 
    label: 'Новое', 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Clock 
  },
  IN_PROGRESS: { 
    label: 'В работе', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: PlayCircle 
  },
  COMPLETED: { 
    label: 'Выполнено', 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle 
  }
};

const sourceConfig = {
  TELEGRAM: { label: 'Telegram', icon: MessageSquare, color: 'text-blue-600' },
  ADMIN: { label: 'Администратор', icon: User, color: 'text-purple-600' },
  MANUAL: { label: 'Ручное', icon: FileText, color: 'text-gray-600' }
};

export default function AdditionalTaskCard({ 
  task, 
  onStatusChange, 
  onDelete,
  showActions = true,
  isCurrentUser = false,
  canDelete = false
}: AdditionalTaskCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const statusInfo = statusConfig[task.status];
  const sourceInfo = sourceConfig[task.source as keyof typeof sourceConfig] || sourceConfig.MANUAL;
  const StatusIcon = statusInfo.icon;
  const SourceIcon = sourceInfo.icon;

  const handleTakeTask = () => {
    if (onStatusChange) {
      onStatusChange(task.id, 'take');
    }
  };

  const handleCompleteTask = () => {
    if (onStatusChange) {
      onStatusChange(task.id, 'complete', completionNote.trim() || undefined);
      setShowCompleteForm(false);
      setCompletionNote('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAttachmentIcon = (url: string) => {
    if (url.includes('voice') || url.includes('audio')) return Mic;
    if (url.includes('photo') || url.includes('image')) return Image;
    return FileText;
  };

  return (
    <Card className={`transition-all duration-200 ${
      task.status === 'NEW' ? 'border-red-200 shadow-md' : 'border-gray-200'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{task.title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span>{task.object.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(task.receivedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={sourceInfo.color}>
              <SourceIcon className="h-3 w-3 mr-1" />
              {sourceInfo.label}
            </Badge>
            <Badge className={statusInfo.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Содержимое задания */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm whitespace-pre-wrap">{task.content}</p>
        </div>

        {/* Вложения */}
        {task.attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Вложения:</p>
            <div className="flex flex-wrap gap-2">
              {task.attachments.map((attachment, index) => {
                const AttachmentIcon = getAttachmentIcon(attachment);
                return (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100 transition-colors"
                  >
                    <AttachmentIcon className="h-3 w-3" />
                    <span>Файл {index + 1}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Информация о выполнении */}
        {task.status !== 'NEW' && (
          <div className="border-t pt-3 space-y-2">
            {task.takenAt && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PlayCircle className="h-4 w-4" />
                <span>Взято в работу: {formatDate(task.takenAt)}</span>
              </div>
            )}
            
            {task.completedAt && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Выполнено: {formatDate(task.completedAt)}</span>
                </div>
                {task.completedBy && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Исполнитель: {task.completedBy.name}</span>
                  </div>
                )}
                {task.completionNote && (
                  <div className="bg-green-50 rounded p-2 mt-2">
                    <p className="text-sm text-green-800">
                      <strong>Комментарий:</strong> {task.completionNote}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Действия для менеджера */}
        {showActions && isCurrentUser && task.status !== 'COMPLETED' && (
          <div className="border-t pt-3">
            {task.status === 'NEW' && (
              <Button 
                onClick={handleTakeTask}
                className="w-full"
                variant="outline"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Взять в работу
              </Button>
            )}

            {task.status === 'IN_PROGRESS' && !showCompleteForm && (
              <Button 
                onClick={() => setShowCompleteForm(true)}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Отметить выполненным
              </Button>
            )}

            {showCompleteForm && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    placeholder="Опишите как было выполнено задание..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCompleteTask}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Выполнено
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowCompleteForm(false);
                      setCompletionNote('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопка удаления для админов */}
        {canDelete && onDelete && (
          <div className="border-t pt-3">
            <Button 
              onClick={() => {
                if (confirm('Вы уверены, что хотите удалить это задание?')) {
                  onDelete(task.id);
                }
              }}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить задание
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
