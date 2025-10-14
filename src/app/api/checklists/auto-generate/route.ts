import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  getCurrentTimeInTimezone, 
  isWorkingDay, 
  createTimeWindows 
} from '@/lib/timezone-utils';

export async function POST(req: NextRequest) {
  try {
    console.log('🤖 Запуск автогенерации чек-листов с учетом часовых поясов...');

    // Получаем все объекты (пока без фильтра autoChecklistEnabled, так как поле еще не в схеме)
    const objects = await prisma.cleaningObject.findMany({
      include: {
        rooms: {
          include: {
            techCards: true
          }
        },
        manager: {
          select: { id: true, name: true }
        }
      }
    });

    console.log(`📋 Найдено объектов: ${objects.length}`);

    let createdCount = 0;
    const now = new Date();

    for (const object of objects) {
      try {
        // Получаем текущее время в часовом поясе объекта
        const objectTime = getCurrentTimeInTimezone(object.timezone || 'Europe/Moscow');
        const workingHours = object.workingHours as { start: string; end: string } || { start: "08:00", end: "20:00" };
        const workingDays = object.workingDays || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

        console.log(`🕐 Объект ${object.name}: местное время ${objectTime.toLocaleString()}, часовой пояс: ${object.timezone}`);

        // Проверяем, рабочий ли день
        if (!isWorkingDay(objectTime, workingDays)) {
          console.log(`📅 ${object.name}: сегодня не рабочий день`);
          continue;
        }

        // Проверяем, есть ли уже чек-лист на сегодня
        const todayString = objectTime.toISOString().split('T')[0];
        const existingChecklist = await prisma.checklist.findFirst({
          where: {
            objectId: object.id,
            date: {
              gte: new Date(todayString),
              lt: new Date(new Date(todayString).getTime() + 24 * 60 * 60 * 1000)
            }
          }
        });

        if (existingChecklist) {
          console.log(`⏭️ Чек-лист для ${object.name} уже существует на ${todayString}`);
          continue;
        }

        // Создаем чек-листы для каждого помещения с техкартами
        for (const room of object.rooms) {
          if (room.techCards.length > 0) {
            console.log(`🏗️ Создание чек-листа для ${object.name} - ${room.name}`);

            // Создаем чек-лист
            const checklist = await prisma.checklist.create({
              data: {
                objectId: object.id,
                roomId: room.id,
                date: objectTime,
                creatorId: object.managerId || 'system-auto-generator'
              }
            });

            // Создаем задачи на основе техкарт с правильными временными окнами
            for (const techCard of room.techCards) {
              const descriptions = (techCard.description || '')
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.trim());

              // Определяем временные окна на основе периодичности техкарты
              let timeWindows = [];
              
              if (techCard.frequency === '2_TIMES_DAY') {
                // 2 раза в день: утром и вечером
                timeWindows = [
                  { start: '08:00', end: '12:00', name: 'Утренняя уборка' },
                  { start: '16:00', end: '20:00', name: 'Вечерняя уборка' }
                ];
              } else if (techCard.frequency === '3_TIMES_DAY') {
                // 3 раза в день: утром, днем, вечером
                timeWindows = [
                  { start: '08:00', end: '12:00', name: 'Утренняя уборка' },
                  { start: '12:00', end: '16:00', name: 'Дневная уборка' },
                  { start: '16:00', end: '20:00', name: 'Вечерняя уборка' }
                ];
              } else {
                // Ежедневно, еженедельно, ежемесячно - весь рабочий день
                timeWindows = [
                  { start: workingHours.start, end: workingHours.end, name: 'Рабочий день' }
                ];
              }

              // Создаем задачи для каждого временного окна
              for (let windowIndex = 0; windowIndex < timeWindows.length; windowIndex++) {
                const timeWindow = timeWindows[windowIndex];
                
                // Создаем даты начала и окончания задачи
                const [startHours, startMinutes] = timeWindow.start.split(':').map(Number);
                const [endHours, endMinutes] = timeWindow.end.split(':').map(Number);
                
                const scheduledStart = new Date(objectTime);
                scheduledStart.setHours(startHours, startMinutes, 0, 0);
                
                const scheduledEnd = new Date(objectTime);
                scheduledEnd.setHours(endHours, endMinutes, 0, 0);

                // Определяем статус задачи
                const now = getCurrentTimeInTimezone(object.timezone || 'Europe/Moscow');
                let taskStatus = 'NEW';
                
                if (now >= scheduledStart && now <= scheduledEnd) {
                  taskStatus = 'AVAILABLE'; // Доступна для выполнения
                } else if (now > scheduledEnd) {
                  taskStatus = 'OVERDUE'; // Просрочена
                }

                // Создаем описание задачи
                const taskDescription = timeWindows.length > 1 
                  ? `${timeWindow.name}: ${techCard.name}` 
                  : techCard.name;

                await prisma.task.create({
                  data: {
                    description: taskDescription,
                    checklistId: checklist.id,
                    roomId: room.id,
                    objectName: object.name,
                    roomName: room.name,
                    scheduledStart,
                    scheduledEnd,
                    status: taskStatus
                  }
                });

                console.log(`📝 Создана задача: ${taskDescription} (${taskStatus}) ${timeWindow.start}-${timeWindow.end}`);
              }
            }

            createdCount++;
            console.log(`✅ Создан чек-лист для ${object.name} - ${room.name} с временными окнами`);
          }
        }

      } catch (objectError) {
        console.error(`❌ Ошибка обработки объекта ${object.name}:`, objectError);
        continue;
      }
    }

    console.log(`🎉 Автогенерация завершена. Создано чек-листов: ${createdCount}`);

    return NextResponse.json({
      success: true,
      message: `Создано чек-листов: ${createdCount}`,
      createdCount,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Ошибка автогенерации чек-листов:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка автогенерации чек-листов' },
      { status: 500 }
    );
  }
}

// GET /api/checklists/auto-generate - Получить статус автогенерации
export async function GET(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Получаем статистику чек-листов за сегодня
    const todayChecklists = await prisma.checklist.count({
      where: {
        date: {
          gte: new Date(today),
          lt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    const totalObjects = await prisma.cleaningObject.count();
    const totalRoomsWithTechCards = await prisma.room.count({
      where: {
        techCards: {
          some: {}
        }
      }
    });

    return NextResponse.json({
      date: today,
      checklistsToday: todayChecklists,
      totalObjects,
      totalRoomsWithTechCards,
      isWeekday: ![0, 6].includes(new Date().getDay())
    });

  } catch (error) {
    console.error('Ошибка получения статуса автогенерации:', error);
    return NextResponse.json(
      { message: 'Ошибка получения статуса' },
      { status: 500 }
    );
  }
}
