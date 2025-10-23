const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Функция для парсинга периодичности из строки
function parseFrequencyDays(frequency) {
  const freq = frequency.toLowerCase();
  
  if (freq.includes('ежедневно') || freq.includes('каждый день') || freq.includes('1 раз в день')) {
    return 1;
  } else if (freq.includes('еженедельно') || freq.includes('раз в неделю') || freq.includes('1 раз в неделю')) {
    return 7;
  } else if (freq.includes('ежемесячно') || freq.includes('раз в месяц') || freq.includes('1 раз в месяц')) {
    return 30;
  } else if (freq.includes('ежеквартально') || freq.includes('раз в квартал')) {
    return 90;
  } else if (freq.includes('раз в год') || freq.includes('ежегодно')) {
    return 365;
  }
  
  // Попытка извлечь число из строки
  const match = freq.match(/(\d+)\s*(раз|день|дня|дней|неделя|недели|недель|месяц|месяца|месяцев)/);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2];
    
    if (unit.includes('день')) {
      return num;
    } else if (unit.includes('недел')) {
      return num * 7;
    } else if (unit.includes('месяц')) {
      return num * 30;
    } else if (unit === 'раз') {
      // Если "раз", то смотрим контекст
      if (freq.includes('неделю')) return Math.round(7 / num);
      if (freq.includes('месяц')) return Math.round(30 / num);
      if (freq.includes('день')) return Math.round(1 / num);
    }
  }
  
  // Специальные случаи
  if (freq.includes('2 раза в день')) return 0.5;
  if (freq.includes('3 раза в день')) return 0.33;
  if (freq.includes('4 раза в день')) return 0.25;
  if (freq.includes('2 раза в неделю')) return 3.5;
  if (freq.includes('3 раза в неделю')) return 2.33;
  if (freq.includes('2 раза в месяц')) return 15;
  if (freq.includes('3 раза в месяц')) return 10;
  if (freq.includes('4 раза в месяц')) return 7.5;
  
  // По умолчанию - ежедневно
  return 1;
}

// Функция для определения предпочтительного времени
function getPreferredTime(frequency, workType) {
  const freq = frequency.toLowerCase();
  const type = workType.toLowerCase();
  
  // Утренние работы
  if (type.includes('уборка') || type.includes('мытье') || type.includes('протирка')) {
    return '08:00';
  }
  
  // Вечерние работы
  if (type.includes('вынос мусора') || type.includes('закрытие')) {
    return '18:00';
  }
  
  // Дневные работы
  if (type.includes('проверка') || type.includes('контроль')) {
    return '14:00';
  }
  
  // По умолчанию утром
  return '09:00';
}

// Функция для определения максимальной задержки
function getMaxDelayHours(frequency) {
  const freq = frequency.toLowerCase();
  
  if (freq.includes('ежедневно') || freq.includes('каждый день')) {
    return 4; // 4 часа для ежедневных задач
  } else if (freq.includes('еженедельно') || freq.includes('раз в неделю')) {
    return 24; // 1 день для еженедельных
  } else if (freq.includes('ежемесячно') || freq.includes('раз в месяц')) {
    return 72; // 3 дня для ежемесячных
  } else if (freq.includes('ежеквартально') || freq.includes('раз в квартал')) {
    return 168; // 1 неделя для квартальных
  }
  
  return 24; // По умолчанию 1 день
}

async function migrateToTaskExecution() {
  try {
    console.log('🔄 МИГРАЦИЯ ДАННЫХ В СИСТЕМУ КАЛЕНДАРЯ ЗАДАЧ');
    console.log('==============================================\n');

    // 1. Анализируем существующие чек-листы и задачи
    console.log('📊 Анализ существующих данных...');
    
    const checklists = await prisma.checklist.findMany({
      include: {
        tasks: true,
        object: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        }
      },
      where: {
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Ограничиваем для безопасности
    });

    console.log(`Найдено завершенных чек-листов: ${checklists.length}`);

    // 2. Группируем задачи по техкартам
    const tasksByTechCard = new Map();
    let totalTasks = 0;

    for (const checklist of checklists) {
      for (const task of checklist.tasks) {
        if (task.status === 'COMPLETED') {
          // Пытаемся найти соответствующую техкарту по названию задачи
          const techCards = await prisma.techCard.findMany({
            where: {
              objectId: checklist.objectId,
              OR: [
                { name: { contains: task.description, mode: 'insensitive' } },
                { description: { contains: task.description, mode: 'insensitive' } }
              ]
            }
          });

          if (techCards.length > 0) {
            const techCard = techCards[0]; // Берем первую подходящую
            const key = `${techCard.id}-${checklist.objectId}`;
            
            if (!tasksByTechCard.has(key)) {
              tasksByTechCard.set(key, {
                techCard,
                objectId: checklist.objectId,
                managerId: checklist.object.managerId,
                executions: []
              });
            }

            tasksByTechCard.get(key).executions.push({
              scheduledFor: checklist.createdAt,
              executedAt: task.completedAt || checklist.createdAt,
              status: 'COMPLETED',
              comment: task.completionComment || null,
              photos: task.completionPhotos || []
            });

            totalTasks++;
          }
        }
      }
    }

    console.log(`Сгруппировано задач по техкартам: ${totalTasks}`);
    console.log(`Уникальных комбинаций техкарта-объект: ${tasksByTechCard.size}\n`);

    // 3. Создаем записи TaskExecution
    console.log('📝 Создание записей TaskExecution...');
    
    let createdExecutions = 0;
    let errors = 0;

    for (const [key, data] of tasksByTechCard) {
      try {
        const { techCard, objectId, managerId, executions } = data;

        // Рассчитываем параметры для техкарты
        const frequencyDays = parseFrequencyDays(techCard.frequency);
        const preferredTime = getPreferredTime(techCard.frequency, techCard.workType);
        const maxDelayHours = getMaxDelayHours(techCard.frequency);

        // Обновляем техкарту с новыми полями (если они еще не заполнены)
        if (!techCard.frequencyDays || !techCard.preferredTime || !techCard.maxDelayHours) {
          await prisma.techCard.update({
            where: { id: techCard.id },
            data: {
              frequencyDays,
              preferredTime,
              maxDelayHours
            }
          });
        }

        // Создаем TaskExecution для каждого выполнения
        for (const execution of executions) {
          const dueDate = new Date(execution.scheduledFor);
          dueDate.setHours(dueDate.getHours() + maxDelayHours);

          await prisma.taskExecution.create({
            data: {
              techCardId: techCard.id,
              objectId: objectId,
              managerId: managerId,
              scheduledFor: execution.scheduledFor,
              dueDate: dueDate,
              executedAt: execution.executedAt,
              status: execution.status,
              comment: execution.comment,
              photos: execution.photos
            }
          });

          createdExecutions++;
        }

        console.log(`✅ ${techCard.name} (${data.executions.length} выполнений)`);

      } catch (error) {
        console.log(`❌ Ошибка для ${key}: ${error.message}`);
        errors++;
      }
    }

    // 4. Создаем записи для будущих задач на основе техкарт
    console.log('\n🔮 Создание будущих задач...');
    
    const allTechCards = await prisma.techCard.findMany({
      where: {
        AND: [
          { frequencyDays: { not: null } },
          { preferredTime: { not: null } },
          { maxDelayHours: { not: null } }
        ]
      },
      include: {
        object: {
          select: {
            id: true,
            name: true,
            managerId: true
          }
        }
      }
    });

    let futureTasks = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const techCard of allTechCards) {
      if (!techCard.object.managerId) continue; // Пропускаем объекты без менеджера

      // Находим последнее выполнение
      const lastExecution = await prisma.taskExecution.findFirst({
        where: {
          techCardId: techCard.id,
          objectId: techCard.objectId
        },
        orderBy: {
          executedAt: 'desc'
        }
      });

      // Рассчитываем следующую дату выполнения
      const baseDate = lastExecution?.executedAt || techCard.createdAt;
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + techCard.frequencyDays);

      // Устанавливаем предпочтительное время
      const [hours, minutes] = techCard.preferredTime.split(':').map(Number);
      nextDate.setHours(hours, minutes, 0, 0);

      // Если дата в будущем, создаем задачу
      if (nextDate > today) {
        const dueDate = new Date(nextDate);
        dueDate.setHours(dueDate.getHours() + techCard.maxDelayHours);

        try {
          await prisma.taskExecution.create({
            data: {
              techCardId: techCard.id,
              objectId: techCard.objectId,
              managerId: techCard.object.managerId,
              scheduledFor: nextDate,
              dueDate: dueDate,
              status: 'PENDING'
            }
          });

          futureTasks++;
        } catch (error) {
          // Игнорируем дубли
          if (!error.message.includes('Unique constraint')) {
            console.log(`❌ Ошибка создания будущей задачи: ${error.message}`);
          }
        }
      }
    }

    // 5. Итоговая статистика
    console.log('\n' + '='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА МИГРАЦИИ:');
    console.log('='.repeat(50));
    console.log(`📋 Проанализировано чек-листов: ${checklists.length}`);
    console.log(`📝 Создано TaskExecution (исторические): ${createdExecutions}`);
    console.log(`🔮 Создано TaskExecution (будущие): ${futureTasks}`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log(`🎯 Всего записей TaskExecution: ${createdExecutions + futureTasks}`);

    // Проверяем результат
    const totalTaskExecutions = await prisma.taskExecution.count();
    console.log(`\n✅ Всего записей в TaskExecution: ${totalTaskExecutions}`);

    // Статистика по статусам
    const statusStats = await prisma.taskExecution.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('\n📊 Распределение по статусам:');
    statusStats.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.status}`);
    });

    console.log('\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('✅ Система календаря задач готова к использованию');

  } catch (error) {
    console.error('❌ Критическая ошибка миграции:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем миграцию
migrateToTaskExecution();
