import { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
// import ManagerCalendarClientPage from './ManagerCalendarClientPage'; // СТАРАЯ СИСТЕМА
import UnifiedCalendarPage from '@/components/UnifiedCalendarPage'; // НОВАЯ СИСТЕМА

export const metadata: Metadata = {
  title: 'Календарь задач - Менеджер',
  description: 'Календарь задач для менеджера объектов',
};

export default function ManagerCalendarPage() {
  return (
    <AppLayout>
      <UnifiedCalendarPage />
    </AppLayout>
  );
}
