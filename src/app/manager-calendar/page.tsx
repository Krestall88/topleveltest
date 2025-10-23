import { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import ManagerCalendarClientPage from './ManagerCalendarClientPage';

export const metadata: Metadata = {
  title: 'Календарь задач - Менеджер',
  description: 'Календарь задач для менеджера объектов',
};

export default function ManagerCalendarPage() {
  return (
    <AppLayout>
      <ManagerCalendarClientPage />
    </AppLayout>
  );
}
