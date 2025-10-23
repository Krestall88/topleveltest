// СТРАНИЦА УДАЛЕНА - ЗАДАЧИ СОЗДАЮТСЯ АВТОМАТИЧЕСКИ

export default function RunSchedulerPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Страница удалена</h1>
          <p className="text-gray-600">
            Эта страница больше не нужна. Задачи теперь создаются автоматически при добавлении техкарт в систему.
          </p>
          <p className="text-sm text-gray-500">
            Перейдите в <a href="/manager-calendar" className="text-blue-600 hover:underline">календарь задач</a> для просмотра созданных задач.
          </p>
        </div>
      </div>
    </div>
  );
}
