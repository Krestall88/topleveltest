import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import ReportingDashboard from '@/components/ReportingDashboard';

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
      role: user.role as 'ADMIN' | 'DEPUTY' | 'DEPUTY_ADMIN' | 'MANAGER' | 'CLIENT',
      name: user.name,
      email: user.email
    };
  } catch (error) {
    return null;
  }
}

export default async function ReportingPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  // Админы, заместители и менеджеры могут видеть отчетность
  if (!['ADMIN', 'DEPUTY_ADMIN', 'MANAGER'].includes(user.role)) {
    redirect('/');
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Отчетность по чек-листам</h1>
          <p className="text-gray-600 mt-2">
            Управление объектами исключенными из автоматического создания задач
          </p>
        </div>

        <ReportingDashboard userRole={user.role} userId={user.id} />
      </div>
    </AppLayout>
  );
}
