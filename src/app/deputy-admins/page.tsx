import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import AppLayout from '@/components/AppLayout';
import DeputyAdminManager from '@/components/DeputyAdminManager';

async function getUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');
    const { payload } = await jwtVerify(token, secret);
    
    return payload as { id: string; email: string; role: string; name?: string };
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return null;
  }
}

export default async function DeputyAdminsPage() {
  const user = await getUserFromCookie();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Только главный администратор может управлять заместителями администраторов
  if (user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8">Загрузка управления заместителями администраторов...</div>}>
        <DeputyAdminManager />
      </Suspense>
    </AppLayout>
  );
}
