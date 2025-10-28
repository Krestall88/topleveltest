'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Key, AlertTriangle } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
  };
  onPasswordReset: () => void;
}

export default function ResetPasswordModal({ 
  isOpen, 
  onClose, 
  user, 
  onPasswordReset 
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          newPassword
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        handleClose();
        onPasswordReset();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка сброса пароля:', error);
      alert('Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Сбросить пароль</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Информация о пользователе */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm">
                <div className="font-medium">{user.name}</div>
                <div className="text-gray-600">{user.email}</div>
              </div>
            </CardContent>
          </Card>

          {/* Предупреждение */}
          <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium">Внимание!</div>
              <div>Пользователь будет уведомлен о смене пароля и должен будет использовать новый пароль для входа.</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Новый пароль</Label>
              <div className="flex space-x-2">
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  className="whitespace-nowrap"
                >
                  Сгенерировать
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                required
              />
            </div>

            {newPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-800">
                  <div className="font-medium">Новый пароль:</div>
                  <div className="font-mono bg-white p-2 rounded mt-1 border">
                    {newPassword}
                  </div>
                  <div className="text-xs mt-1">
                    Скопируйте и передайте пользователю
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {loading ? 'Сброс...' : 'Сбросить пароль'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
