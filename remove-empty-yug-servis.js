const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeEmptyYugServis() {
  try {
    console.log('🗑️ УДАЛЕНИЕ ПУСТОГО ОБЪЕКТА УК ЮГ-СЕРВИС');
    console.log('==========================================\n');

    // Находим объект по ID
    const emptyObject = await prisma.cleaningObject.findUnique({
      where: { id: 'cmgzsv7ho0001vys41jpmf7uy' },
      include: {
        manager: { select: { name: true } },
        _count: {
          select: {
            sites: true,
            rooms: true,
            techCards: true,
            checklists: true
          }
        }
      }
    });

    if (!emptyObject) {
      console.log('❌ Объект с указанным ID не найден');
      return;
    }

    console.log('📋 ИНФОРМАЦИЯ ОБ ОБЪЕКТЕ:');
    console.log(`🏢 Название: ${emptyObject.name}`);
    console.log(`👤 Менеджер: ${emptyObject.manager?.name || 'не назначен'}`);
    console.log(`🗺️ Участков: ${emptyObject._count.sites}`);
    console.log(`🚪 Помещений: ${emptyObject._count.rooms}`);
    console.log(`🔧 Техкарт: ${emptyObject._count.techCards}`);
    console.log(`📋 Чек-листов: ${emptyObject._count.checklists}`);

    // Проверяем, действительно ли объект пустой
    const isEmpty = emptyObject._count.sites === 0 && 
                   emptyObject._count.rooms === 0 && 
                   emptyObject._count.techCards === 0 && 
                   emptyObject._count.checklists === 0;

    if (!isEmpty) {
      console.log('\n⚠️ ВНИМАНИЕ: Объект не пустой!');
      console.log('Объект содержит данные и не будет удален для безопасности.');
      return;
    }

    console.log('\n✅ Объект подтвержден как пустой');

    // Находим рабочий объект УК Юг-сервис
    const workingObject = await prisma.cleaningObject.findFirst({
      where: {
        AND: [
          { id: { not: 'cmgzsv7ho0001vys41jpmf7uy' } },
          {
            name: {
              contains: 'Юг-сервис',
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        manager: { select: { name: true } },
        _count: {
          select: {
            sites: true,
            rooms: true,
            techCards: true
          }
        }
      }
    });

    if (workingObject) {
      console.log('\n📊 РАБОЧИЙ ОБЪЕКТ УК ЮГ-СЕРВИС:');
      console.log(`🏢 Название: ${workingObject.name}`);
      console.log(`👤 Менеджер: ${workingObject.manager?.name || 'не назначен'}`);
      console.log(`🗺️ Участков: ${workingObject._count.sites}`);
      console.log(`🚪 Помещений: ${workingObject._count.rooms}`);
      console.log(`🔧 Техкарт: ${workingObject._count.techCards}`);
    }

    // Находим админа для логирования
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    console.log('\n🗑️ Удаление пустого объекта...');

    // Удаляем объект
    await prisma.cleaningObject.delete({
      where: { id: 'cmgzsv7ho0001vys41jpmf7uy' }
    });

    console.log('✅ Объект успешно удален');

    // Логируем в аудит
    if (admin) {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: 'DELETE_EMPTY_OBJECT',
          entity: 'OBJECT',
          entityId: 'cmgzsv7ho0001vys41jpmf7uy',
          details: `Удален пустой дублирующий объект: ${emptyObject.name}`
        }
      });
    }

    // Проверяем итоговое состояние
    const remainingYugServis = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      include: {
        manager: { select: { name: true } },
        _count: {
          select: {
            sites: true,
            rooms: true,
            techCards: true
          }
        }
      }
    });

    console.log('\n📊 ИТОГОВОЕ СОСТОЯНИЕ:');
    console.log('='.repeat(25));
    console.log(`🏢 Объектов УК Юг-сервис осталось: ${remainingYugServis.length}`);
    
    remainingYugServis.forEach((obj, index) => {
      console.log(`\n${index + 1}. ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   👤 Менеджер: ${obj.manager?.name || 'не назначен'}`);
      console.log(`   🗺️ Участков: ${obj._count.sites}`);
      console.log(`   🚪 Помещений: ${obj._count.rooms}`);
      console.log(`   🔧 Техкарт: ${obj._count.techCards}`);
    });

    console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!');
    console.log('✅ Пустой дубль удален');
    console.log('✅ Рабочий объект сохранен');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeEmptyYugServis();
