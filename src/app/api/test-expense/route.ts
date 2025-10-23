import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Тестирование создания расхода...');
    
    // Проверяем аутентификацию
    const session = await getAuthSession();
    console.log('📝 Session:', session);
    
    if (!session?.user) {
      console.log('❌ Нет сессии');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;
    console.log('👤 User:', user);

    // Получаем данные из запроса
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { objectId, amount, description } = body;

    if (!objectId || !amount || !description) {
      console.log('❌ Отсутствуют обязательные поля');
      return NextResponse.json({ 
        error: 'objectId, amount, and description are required',
        received: { objectId, amount, description }
      }, { status: 400 });
    }

    // Проверяем существование объекта
    const object = await prisma.cleaningObject.findUnique({
      where: { id: objectId },
      select: { id: true, name: true, managerId: true }
    });
    
    console.log('🏢 Object:', object);
    
    if (!object) {
      console.log('❌ Объект не найден');
      return NextResponse.json({ error: 'Object not found' }, { status: 404 });
    }

    // Проверяем права доступа для менеджеров
    if (user.role === 'MANAGER' && object.managerId !== user.id) {
      console.log('❌ Нет доступа к объекту');
      return NextResponse.json({ error: 'Access denied to this object' }, { status: 403 });
    }

    // Создаем расход
    const currentDate = new Date();
    const expenseData = {
      objectId,
      amount: parseFloat(amount),
      description,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
      recordedById: user.id
    };
    
    console.log('💰 Creating expense with data:', expenseData);

    const expense = await prisma.inventoryExpense.create({
      data: expenseData,
      include: {
        object: {
          select: { id: true, name: true, address: true }
        },
        recordedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    console.log('✅ Expense created:', expense);

    return NextResponse.json({ 
      success: true, 
      expense,
      debug: {
        user,
        object,
        expenseData
      }
    });

  } catch (error) {
    console.error('❌ Error creating test expense:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
