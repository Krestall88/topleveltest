import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import AnalyticsClientPage from './AnalyticsClientPage';

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });

    if (!user || !user.name) return null;

    return {
      id: user.id,
      role: user.role as 'ADMIN' | 'DEPUTY' | 'MANAGER' | 'CLIENT',
      name: user.name,
      email: user.email
    };
  } catch (error) {
    return null;
  }
}

async function getObjects() {
  try {
    const objects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return objects;
  } catch (error) {
    console.error('Ошибка при загрузке объектов:', error);
    return [];
  }
}

export default async function AnalyticsPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  const objects = await getObjects();

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8">Загрузка аналитики...</div>}>
        <AnalyticsClientPage 
          objects={objects} 
          userRole={user.role} 
          userId={user.id} 
        />
      </Suspense>
    </AppLayout>
  );
}
