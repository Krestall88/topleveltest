'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Building } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

interface CleaningObject {
  id: string;
  name: string;
  address: string;
}

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'DEPUTY_ADMIN',
    phone: ''
  });
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [objects, setObjects] = useState<CleaningObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadObjects();
    }
  }, [isOpen]);


  const loadObjects = async () => {
    try {
      setLoadingObjects(true);
      const response = await fetch('/api/objects', {
        credentials: 'include'
      });

      if (response.ok) {
        const objectsData = await response.json();
        setObjects(objectsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.name || !formData.password || !formData.role) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (formData.password.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          assignedObjectIds: selectedObjects
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        resetForm();
        onUserCreated();
      } else {
        const errorData = await response.json();
        alert(`Ошибка: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      alert('Ошибка создания пользователя');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'DEPUTY_ADMIN',
      phone: ''
    });
    setSelectedObjects([]);
  };

  const generateLogin = () => {
    if (formData.name) {
      // Функция транслитерации
      const transliterate = (text: string) => {
        const map: { [key: string]: string } = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
          'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
          'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
          'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
          'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
          'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
        };
        return text.replace(/[а-яёА-ЯЁ]/g, char => map[char] || char);
      };

      // Разбиваем имя на части
      const parts = formData.name.trim().split(/\s+/);
      
      let login = '';
      if (parts.length >= 2) {
        // Фамилия + имя
        const lastName = transliterate(parts[0]).toLowerCase();
        const firstName = transliterate(parts[1]).toLowerCase();
        login = `${lastName}.${firstName}`;
      } else {
        // Если только одно слово
        login = transliterate(parts[0]).toLowerCase();
      }
      
      // Убираем недопустимые символы
      login = login.replace(/[^a-z0-9.]/g, '');
      
      const email = `${login}@cleaning.com`;
      setFormData({ ...formData, email });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleObjectToggle = (objectId: string) => {
    setSelectedObjects(prev => 
      prev.includes(objectId)
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };

  const roleOptions = [
    { value: 'DEPUTY_ADMIN', label: 'Заместитель администратора' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5" />
            <span>Создать нового пользователя</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите имя"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email (логин) *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@cleaning.com"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateLogin}
                      disabled={!formData.name}
                      className="whitespace-nowrap"
                    >
                      Сгенерировать
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="password">Пароль *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  Роль: Заместитель администратора
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Будет иметь те же права что и главный администратор, но только по назначенным объектам
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Назначение объектов для заместителя */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Назначение объектов</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingObjects ? (
                  <div className="text-center py-4">Загрузка объектов...</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {objects.map((object) => (
                      <div key={object.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          checked={selectedObjects.includes(object.id)}
                          onCheckedChange={() => handleObjectToggle(object.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{object.name}</div>
                          <div className="text-sm text-gray-600">{object.address}</div>
                        </div>
                      </div>
                    ))}
                    
                    {objects.length === 0 && (
                      <div className="text-center py-4 text-gray-600">
                        Объекты не найдены
                      </div>
                    )}
                  </div>
                )}
                
                {selectedObjects.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded">
                    <div className="text-sm font-medium">
                      Выбрано объектов: {selectedObjects.length}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : 'Создать пользователя'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
