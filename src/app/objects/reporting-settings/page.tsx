import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import ReportingSettingsPage from '@/components/ReportingSettingsPage';

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

export default async function ReportingSettingsPageWrapper() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  // Только админы и заместители могут настраивать отчетность
  if (user.role !== 'ADMIN' && user.role !== 'DEPUTY') {
    redirect('/objects');
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Настройки отчетности</h1>
          <p className="text-gray-600 mt-2">
            Выберите объекты, которые будут исключены из автоматического создания задач
          </p>
        </div>

        <ReportingSettingsPage />
      </div>
    </AppLayout>
  );
}
