'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Key, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  onPasswordChanged: () => void;
}

export default function ChangePasswordModal({ 
  isOpen, 
  onClose, 
  user, 
  onPasswordChanged 
}: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }

    if (formData.newPassword.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
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
          newPassword: formData.newPassword
        }),
      });

      if (response.ok) {
        alert('Пароль успешно изменен');
        handleClose();
        onPasswordChanged();
      } else {
        const errorData = await response.json();
        alert(`Ошибка смены пароля: ${errorData.message}`);
      }
      
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      alert('Ошибка смены пароля');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ newPassword: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, newPassword: password, confirmPassword: password });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="w-5 h-5" />
            <span>Смена пароля</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium">Смена пароля для: {user.name}</div>
                  <div className="text-xs mt-1">Email: {user.email}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">Новый пароль *</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        placeholder="Минимум 6 символов"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
                  <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Повторите новый пароль"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {formData.newPassword && formData.confirmPassword && 
                 formData.newPassword !== formData.confirmPassword && (
                  <div className="text-sm text-red-600">
                    Пароли не совпадают
                  </div>
                )}

                {formData.newPassword && formData.newPassword.length >= 6 && 
                 formData.newPassword === formData.confirmPassword && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-800">
                      <div className="font-medium">Новый пароль готов</div>
                      <div className="text-xs mt-1">
                        Пароль соответствует требованиям безопасности
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 6}
            >
              {loading ? 'Изменение...' : 'Изменить пароль'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
