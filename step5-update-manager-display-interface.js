// Этот файл содержит обновления для интерфейса отображения менеджеров
// Нужно будет применить эти изменения к ObjectDetailClientPage.tsx

const updatedManagerDisplayCode = `
// ОБНОВЛЕННЫЙ БЛОК ОТОБРАЖЕНИЯ МЕНЕДЖЕРОВ (для ObjectDetailClientPage.tsx)

{/* Менеджеры объекта - КОМПАКТНЫЙ ДИЗАЙН */}
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-medium text-gray-900 flex items-center">
      <Users className="w-4 h-4 mr-2 text-blue-600" />
      Менеджеры
    </h3>
    {(userRole === 'ADMIN' || userRole === 'DEPUTY') && (
      <Button
        onClick={() => {
          setIsEditingManager(true);
          setSelectedManagerId(object.manager?.id || '');
        }}
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
      >
        <Edit className="w-3 h-3 mr-1" />
        Изменить
      </Button>
    )}
  </div>

  <div className="space-y-2">
    {/* Основной менеджер */}
    {object.manager && (
      <div className="flex items-center justify-between p-2 bg-blue-50 rounded border-l-2 border-blue-500">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
            <Crown className="w-3 h-3 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">{object.manager.name}</span>
            <span className="text-xs text-blue-600 block">Основной менеджер</span>
          </div>
        </div>
        {isEditingManager && (
          <div className="flex items-center space-x-1">
            <Button
              onClick={handleSaveManager}
              disabled={!selectedManagerId || selectedManagerId === (object.manager?.id || '')}
              size="sm"
              className="h-6 px-2 text-xs"
            >
              Сохранить
            </Button>
            <Button
              onClick={() => {
                setIsEditingManager(false);
                setSelectedManagerId(object.manager?.id || '');
              }}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
            >
              Отмена
            </Button>
          </div>
        )}
      </div>
    )}

    {/* Менеджеры участков */}
    {object.sites && object.sites.length > 0 && (
      <>
        {object.sites
          .filter(site => site.manager && site.manager.id !== object.manager?.id)
          .map((site, index) => (
            <div key={site.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border-l-2 border-gray-300">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center mr-2">
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-800">{site.manager.name}</span>
                  <span className="text-xs text-gray-600 block">
                    {site.comment || site.name}
                  </span>
                </div>
              </div>
              {(userRole === 'ADMIN' || userRole === 'DEPUTY') && (
                <Button
                  onClick={() => handleEditSiteManager(site.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <Edit className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))
        }
      </>
    )}

    {/* Если нет менеджеров */}
    {!object.manager && (!object.sites || object.sites.filter(s => s.manager).length === 0) && (
      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded border-l-2 border-yellow-400">
        <div className="flex items-center">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
          <span className="text-sm text-yellow-800">Менеджеры не назначены</span>
        </div>
        {(userRole === 'ADMIN' || userRole === 'DEPUTY') && (
          <Button
            onClick={() => {
              setIsEditingManager(true);
              setSelectedManagerId('');
            }}
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
          >
            Назначить
          </Button>
        )}
      </div>
    )}

    {/* Форма выбора менеджера */}
    {isEditingManager && (
      <div className="p-3 bg-blue-50 rounded border">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">
            Выберите менеджера:
          </label>
          <select
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Выберите менеджера --</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              onClick={() => {
                setIsEditingManager(false);
                setSelectedManagerId(object.manager?.id || '');
              }}
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSaveManager}
              disabled={!selectedManagerId || selectedManagerId === (object.manager?.id || '')}
              size="sm"
              className="h-7 px-3 text-xs"
            >
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

// ДОПОЛНИТЕЛЬНЫЕ ИМПОРТЫ (добавить в начало файла):
import { Users, Crown, MapPin, Edit, AlertTriangle } from 'lucide-react';

// ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ (добавить в компонент):
const handleEditSiteManager = async (siteId: string) => {
  // Логика редактирования менеджера участка
  // Можно открыть модальное окно или использовать inline редактирование
  console.log('Редактирование менеджера участка:', siteId);
};
`;

console.log('📋 ПЛАН ОБНОВЛЕНИЯ ИНТЕРФЕЙСА:');
console.log('');
console.log('1. 🎨 КОМПАКТНЫЙ ДИЗАЙН:');
console.log('   - Уменьшены отступы и размеры элементов');
console.log('   - Более строгий и лаконичный вид');
console.log('   - Занимает меньше места на странице');
console.log('');
console.log('2. 🔧 ДИНАМИЧЕСКОЕ ОТОБРАЖЕНИЕ:');
console.log('   - Автоматически подстраивается под любое количество менеджеров');
console.log('   - Отдельное отображение основного менеджера и менеджеров участков');
console.log('   - Показывает комментарии к каждому менеджеру');
console.log('');
console.log('3. ✏️ ВОЗМОЖНОСТЬ РЕДАКТИРОВАНИЯ:');
console.log('   - Редактирование основного менеджера объекта');
console.log('   - Кнопки редактирования менеджеров участков');
console.log('   - Inline форма выбора менеджера');
console.log('');
console.log('4. 🎯 ВИЗУАЛЬНЫЕ ИНДИКАТОРЫ:');
console.log('   - Корона для основного менеджера (синий блок)');
console.log('   - Булавка для менеджеров участков (серые блоки)');
console.log('   - Предупреждение при отсутствии менеджеров (желтый блок)');
console.log('');
console.log('📁 ФАЙЛЫ ДЛЯ ОБНОВЛЕНИЯ:');
console.log('   - src/app/objects/[id]/ObjectDetailClientPage.tsx');
console.log('');
console.log('🔧 НЕОБХОДИМЫЕ ИЗМЕНЕНИЯ:');
console.log('   1. Заменить существующий блок менеджеров на новый код');
console.log('   2. Добавить импорты иконок из lucide-react');
console.log('   3. Добавить функцию handleEditSiteManager');
console.log('   4. Обновить API для поддержки редактирования участков');

module.exports = {
  updatedManagerDisplayCode
};
