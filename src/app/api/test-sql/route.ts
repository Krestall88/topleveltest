import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Сначала проверим, как именно называется таблица
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name ILIKE '%taskexecution%' 
      OR table_name ILIKE '%task_execution%'
      ORDER BY table_name, ordinal_position
    `;
    
    console.log('🔍 Найденные таблицы TaskExecution:', tableCheck);

    // Попробуем разные варианты названия
    let testData;
    try {
      // Вариант 1: TaskExecution
      testData = await prisma.$queryRaw`
        SELECT te.id, te."managerId", u.name as "managerName", u.phone as "managerPhone"
        FROM "TaskExecution" te
        LEFT JOIN "User" u ON te."managerId" = u.id
        LIMIT 3
      `;
    } catch (error1) {
      try {
        // Вариант 2: taskexecution (нижний регистр)
        testData = await prisma.$queryRaw`
          SELECT te.id, te."managerId", u.name as "managerName", u.phone as "managerPhone"
          FROM taskexecution te
          LEFT JOIN "User" u ON te."managerId" = u.id
          LIMIT 3
        `;
      } catch (error2) {
        try {
          // Вариант 3: task_execution (с подчеркиванием)
          testData = await prisma.$queryRaw`
            SELECT te.id, te."managerId", u.name as "managerName", u.phone as "managerPhone"
            FROM task_execution te
            LEFT JOIN "User" u ON te."managerId" = u.id
            LIMIT 3
          `;
        } catch (error3) {
          testData = { error: 'Не удалось найти таблицу TaskExecution ни в одном варианте' };
        }
      }
    }
    
    console.log('🔍 Тест TaskExecution результат:', testData);

    return NextResponse.json({
      success: true,
      tableCheck: tableCheck,
      data: testData,
      count: Array.isArray(testData) ? testData.length : 0,
      message: 'Тест TaskExecution с проверкой названия таблицы'
    });

  } catch (error) {
    console.error('🚫 Ошибка тест SQL:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
