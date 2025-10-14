import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import ManagerDetailClientPage from './ManagerDetailClientPage';

async function getUserFromCookie() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, name: true, email: true }
    });

    return user;
  } catch (error) {
    return null;
  }
}

export default async function ManagerDetailPage({ params }: { params: { id: string } }) {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  // Проверяем права доступа
  if (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR') {
    redirect('/');
  }

  return <ManagerDetailClientPage managerId={params.id} user={user} />;
}
