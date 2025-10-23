import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SitesClientPage from './SitesClientPage';

export default async function SitesPage() {
  const session = await getAuthSession();
  
  if (!session) {
    redirect('/auth/signin');
  }

  // Проверяем права доступа
  if (!['ADMIN', 'DEPUTY'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <SitesClientPage />;
}
