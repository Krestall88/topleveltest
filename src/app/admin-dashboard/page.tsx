import { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import AdminTaskDashboard from '@/components/AdminTaskDashboard';

export const metadata: Metadata = {
  title: 'Административная панель - Календарь задач',
  description: 'Панель контроля календаря задач и отчетности',
};

export default function AdminDashboardPage() {
  return (
    <AppLayout>
      <AdminTaskDashboard />
    </AppLayout>
  );
}
