import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import SitesClientPage from './SitesClientPage';

export default async function SitesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  // Проверяем права доступа
  if (!['ADMIN', 'DEPUTY'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <SitesClientPage />;
}
