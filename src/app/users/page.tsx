import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import UsersClientPage from './UsersClientPage';

async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return null;

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

export default async function UsersPage() {
  const user = await getUserFromToken();

  // Только админ может управлять пользователями
  if (!user || user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <AppLayout>
      <UsersClientPage />
    </AppLayout>
  );
}
