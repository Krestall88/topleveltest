import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import MobileManagerInterface from '@/components/MobileManagerInterface';

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

export default async function MobilePage() {
  const user = await getUserFromCookie();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Мобильный интерфейс доступен только менеджерам
  if (user.role !== 'MANAGER') {
    redirect('/');
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-8">Загрузка мобильного интерфейса...</div>
      </div>
    }>
      <MobileManagerInterface userId={user.id} />
    </Suspense>
  );
}
