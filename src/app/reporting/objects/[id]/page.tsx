import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import ReportingObjectDetail from '@/components/ReportingObjectDetail';

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

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ReportingObjectPage({ params }: PageProps) {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  // Только админы, заместители и менеджеры могут видеть отчетность
  if (!['ADMIN', 'DEPUTY', 'MANAGER'].includes(user.role)) {
    redirect('/');
  }

  // Ждем params перед использованием
  const { id } = await params;

  // Получаем информацию об объекте (без поля excludeFromTasks пока)
  const object = await prisma.cleaningObject.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      managerId: true,
      manager: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Добавляем поле excludeFromTasks как true (временно)
  const objectWithExcludeFlag = object ? {
    ...object,
    excludeFromTasks: true
  } : null;

  if (!object) {
    redirect('/reporting');
  }

  // Проверяем права доступа для менеджеров
  if (user.role === 'MANAGER' && object.managerId !== user.id) {
    redirect('/reporting');
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <ReportingObjectDetail 
          object={objectWithExcludeFlag} 
          userRole={user.role} 
          userId={user.id} 
        />
      </div>
    </AppLayout>
  );
}
