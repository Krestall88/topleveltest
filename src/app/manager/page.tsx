import { Metadata } from 'next';
import ManagerDashboard from '@/components/ManagerDashboard';

export const metadata: Metadata = {
  title: 'Мои задачи - Менеджер',
  description: 'Управление задачами для менеджера объектов',
};

export default function ManagerPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <ManagerDashboard />
    </div>
  );
}
