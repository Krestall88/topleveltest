import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

async function getUserFromToken(req: NextRequest) {
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

export async function POST(req: NextRequest) {
  console.log('🧹 CLEANUP: Полная очистка объекта по имени');
  
  try {
    const user = await getUserFromToken(req);
    if (!user || !['ADMIN', 'DEPUTY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Доступ запрещен' }, { status: 403 });
    }

    const { objectName } = await req.json();

    if (!objectName) {
      return NextResponse.json({ 
        message: 'Не указано имя объекта для очистки' 
      }, { status: 400 });
    }

    console.log('🧹 CLEANUP: Поиск объекта:', objectName);

    // Ищем объект по имени
    const existingObject = await prisma.cleaningObject.findFirst({
      where: { 
        name: {
          equals: objectName,
          mode: 'insensitive'
        }
      },
      include: {
        sites: {
          include: {
            zones: {
              include: {
                roomGroups: {
                  include: {
                    rooms: true
                  }
                }
              }
            }
          }
        },
        tasks: true,
        checklists: true,
        additionalTasks: true,
        reportingTasks: true,
        photoReports: true
      }
    });

    if (!existingObject) {
      return NextResponse.json({
        success: true,
        message: `Объект "${objectName}" не найден - очистка не требуется`,
        data: { found: false }
      });
    }

    console.log('🧹 CLEANUP: Найден объект для очистки:', existingObject.id);

    const cleanupResults = {
      objectId: existingObject.id,
      objectName: existingObject.name,
      deleted: {
        tasks: 0,
        checklists: 0,
        additionalTasks: 0,
        reportingTasks: 0,
        photoReports: 0,
        rooms: 0,
        roomGroups: 0,
        zones: 0,
        sites: 0,
        taskExecutions: 0,
        inventoryLimits: 0,
        inventoryExpenses: 0,
        excludedObjects: 0,
        deputyAdminAssignments: 0
      }
    };

    // Удаляем в правильном порядке (от зависимых к независимым)
    
    // 1. Удаляем задачи и связанные данные
    const deletedTasks = await prisma.task.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.tasks = deletedTasks.count;
    console.log(`🗑️ Удалено задач: ${deletedTasks.count}`);

    // 2. Удаляем выполнения задач
    const deletedTaskExecutions = await prisma.taskExecution.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.taskExecutions = deletedTaskExecutions.count;
    console.log(`🗑️ Удалено выполнений задач: ${deletedTaskExecutions.count}`);

    // 3. Удаляем чеклисты
    const deletedChecklists = await prisma.checklist.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.checklists = deletedChecklists.count;
    console.log(`🗑️ Удалено чеклистов: ${deletedChecklists.count}`);

    // 4. Удаляем дополнительные задачи
    const deletedAdditionalTasks = await prisma.additionalTask.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.additionalTasks = deletedAdditionalTasks.count;
    console.log(`🗑️ Удалено доп. задач: ${deletedAdditionalTasks.count}`);

    // 5. Удаляем отчетные задачи
    const deletedReportingTasks = await prisma.reportingTask.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.reportingTasks = deletedReportingTasks.count;
    console.log(`🗑️ Удалено отчетных задач: ${deletedReportingTasks.count}`);

    // 6. Удаляем фото отчеты
    const deletedPhotoReports = await prisma.photoReport.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.photoReports = deletedPhotoReports.count;
    console.log(`🗑️ Удалено фото отчетов: ${deletedPhotoReports.count}`);

    // 7. Удаляем инвентарь
    const deletedInventoryLimits = await prisma.inventoryLimit.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.inventoryLimits = deletedInventoryLimits.count;
    console.log(`🗑️ Удалено лимитов инвентаря: ${deletedInventoryLimits.count}`);

    const deletedInventoryExpenses = await prisma.inventoryExpense.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.inventoryExpenses = deletedInventoryExpenses.count;
    console.log(`🗑️ Удалено расходов инвентаря: ${deletedInventoryExpenses.count}`);

    // 8. Удаляем исключения
    const deletedExcludedObjects = await prisma.excludedObject.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.excludedObjects = deletedExcludedObjects.count;
    console.log(`🗑️ Удалено исключений: ${deletedExcludedObjects.count}`);

    // 9. Удаляем назначения заместителей
    const deletedDeputyAssignments = await prisma.deputyAdminAssignment.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.deputyAdminAssignments = deletedDeputyAssignments.count;
    console.log(`🗑️ Удалено назначений заместителей: ${deletedDeputyAssignments.count}`);

    // 10. Удаляем помещения
    for (const site of existingObject.sites) {
      for (const zone of site.zones) {
        for (const roomGroup of zone.roomGroups) {
          const deletedRooms = await prisma.room.deleteMany({
            where: { roomGroupId: roomGroup.id }
          });
          cleanupResults.deleted.rooms += deletedRooms.count;
          console.log(`🗑️ Удалено помещений в группе ${roomGroup.name}: ${deletedRooms.count}`);
        }
        
        // Удаляем группы помещений
        const deletedRoomGroups = await prisma.roomGroup.deleteMany({
          where: { zoneId: zone.id }
        });
        cleanupResults.deleted.roomGroups += deletedRoomGroups.count;
        console.log(`🗑️ Удалено групп помещений в зоне ${zone.name}: ${deletedRoomGroups.count}`);
      }
      
      // Удаляем зоны
      const deletedZones = await prisma.zone.deleteMany({
        where: { siteId: site.id }
      });
      cleanupResults.deleted.zones += deletedZones.count;
      console.log(`🗑️ Удалено зон на участке ${site.name}: ${deletedZones.count}`);
    }

    // 11. Удаляем участки
    const deletedSites = await prisma.site.deleteMany({
      where: { objectId: existingObject.id }
    });
    cleanupResults.deleted.sites = deletedSites.count;
    console.log(`🗑️ Удалено участков: ${deletedSites.count}`);

    // 12. Наконец удаляем сам объект
    await prisma.cleaningObject.delete({
      where: { id: existingObject.id }
    });

    console.log(`✅ CLEANUP: Объект "${objectName}" полностью удален`);

    return NextResponse.json({
      success: true,
      message: `Объект "${objectName}" полностью очищен и удален`,
      data: {
        found: true,
        ...cleanupResults
      }
    });

  } catch (error) {
    console.error('❌ CLEANUP: Ошибка при очистке объекта:', error);
    return NextResponse.json(
      { 
        message: 'Ошибка при очистке объекта', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
