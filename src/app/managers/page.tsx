import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import ManagersClientPage from './ManagersClientPage';

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
      role: user.role,
      name: user.name,
      email: user.email
    };
  } catch (error) {
    return null;
  }
}

export default async function ManagersPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  // Проверяем права доступа - только ADMIN и DEPUTY_ADMIN могут видеть менеджеров
  if (user.role !== 'ADMIN' && user.role !== 'DEPUTY_ADMIN') {
    redirect('/');
  }

  return (
    <AppLayout>
      <ManagersClientPage user={user} />
    </AppLayout>
  );
}
