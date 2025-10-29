import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  console.log('🧪 TEST: Проверка создания техкарты');
  
  try {
    // Тестовые данные
    const testObjectId = 'test-object-id';
    const testName = 'Тест - Сухая уборка';
    
    // Проверяем, есть ли тестовый объект
    let testObject = await prisma.cleaningObject.findFirst({
      where: { name: 'Тестовый объект' }
    });
    
    if (!testObject) {
      // Создаем тестовый объект
      testObject = await prisma.cleaningObject.create({
        data: {
          name: 'Тестовый объект',
          address: 'Тестовый адрес',
          creatorId: 'test-user-id'
        }
      });
      console.log('✅ Создан тестовый объект:', testObject.id);
    }
    
    // Пробуем создать техкарту
    const techCard = await prisma.techCard.create({
      data: {
        name: testName,
        workType: 'CLEANING',
        frequency: 'DAILY',
        description: 'Тестовая техкарта для проверки',
        objectId: testObject.id,
        isActive: true
      }
    });
    
    console.log('✅ Создана тестовая техкарта:', techCard.id);
    
    return NextResponse.json({
      success: true,
      message: 'Тест прошел успешно',
      data: {
        object: {
          id: testObject.id,
          name: testObject.name
        },
        techCard: {
          id: techCard.id,
          name: techCard.name,
          workType: techCard.workType,
          frequency: techCard.frequency
        }
      }
    });
    
  } catch (error) {
    console.error('❌ TEST: Ошибка при тесте:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при тесте', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
