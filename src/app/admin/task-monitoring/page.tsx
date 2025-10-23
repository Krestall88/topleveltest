import { Metadata } from 'next';
import TaskMonitoringDashboard from '@/components/TaskMonitoringDashboard';

export const metadata: Metadata = {
  title: 'Мониторинг задач - Администратор',
  description: 'Панель администратора для мониторинга выполнения задач',
};

export default function TaskMonitoringPage() {
  return (
    <div className="container mx-auto p-6">
      <TaskMonitoringDashboard />
    </div>
  );
}
