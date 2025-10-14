import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import InventoryFinancialReport from '@/components/InventoryFinancialReport';

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
      role: user.role as 'ADMIN' | 'DEPUTY' | 'MANAGER' | 'ACCOUNTANT' | 'CLIENT',
      name: user.name,
      email: user.email
    };
  } catch (error) {
    return null;
  }
}

export default async function InventoryPage() {
  const user = await getUserFromCookie();

  if (!user) {
    redirect('/auth/login');
  }

  // Определяем какой интерфейс показать в зависимости от роли
  const renderInterface = () => {
    // Новый финансовый отчет для всех ролей
    return <InventoryFinancialReport />;
  };

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8">Загрузка инвентаря...</div>}>
        <div className="p-8">
          {renderInterface()}
        </div>
      </Suspense>
    </AppLayout>
  );
}
