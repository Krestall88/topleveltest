'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send } from 'lucide-react';
import type { AdditionalTaskComment } from '@/types';

interface AdditionalTaskCommentsProps {
  taskId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export default function AdditionalTaskComments({ 
  taskId, 
  currentUserId, 
  isAdmin 
}: AdditionalTaskCommentsProps) {
  const [comments, setComments] = useState<AdditionalTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/additional-tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/additional-tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
      } else {
        alert('Ошибка при добавлении комментария');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
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

  if (fetching) {
    return (
      <div className="text-center py-4 text-gray-500">
        Загрузка комментариев...
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-5 w-5 text-gray-600" />
        <h4 className="font-semibold text-gray-900">
          Комментарии {comments.length > 0 && `(${comments.length})`}
        </h4>
      </div>
      
      {/* Список комментариев */}
      {comments.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border ${
                comment.isAdmin
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    comment.isAdmin 
                      ? 'bg-amber-200 text-amber-800' 
                      : 'bg-blue-200 text-blue-800'
                  }`}>
                    {comment.isAdmin ? '👨‍💼 Администратор' : '👤 Менеджер'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user?.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Комментариев пока нет</p>
        </div>
      )}

      {/* Форма добавления комментария */}
      <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700">
          {isAdmin ? 'Оставить комментарий для менеджера' : 'Ответить администратору'}
        </label>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isAdmin 
            ? 'Напишите комментарий или вопрос менеджеру...' 
            : 'Напишите ответ или уточнение...'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          disabled={loading}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || loading}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? 'Отправка...' : 'Отправить комментарий'}
        </Button>
      </div>
    </div>
  );
}
