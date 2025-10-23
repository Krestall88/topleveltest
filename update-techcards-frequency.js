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

async function updateTechCardsFrequency() {
  try {
    console.log('🔄 ОБНОВЛЕНИЕ ТЕХКАРТ С ПОЛЯМИ ПЕРИОДИЧНОСТИ');
    console.log('===========================================\n');

    // Получаем все техкарты
    const techCards = await prisma.techCard.findMany({
      select: {
        id: true,
        name: true,
        frequency: true,
        workType: true,
        frequencyDays: true,
        preferredTime: true,
        maxDelayHours: true
      }
    });

    console.log(`📋 Найдено техкарт: ${techCards.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const techCard of techCards) {
      // Пропускаем уже обновленные техкарты
      if (techCard.frequencyDays !== null && techCard.preferredTime !== null && techCard.maxDelayHours !== null) {
        skippedCount++;
        continue;
      }

      const frequencyDays = parseFrequencyDays(techCard.frequency);
      const preferredTime = getPreferredTime(techCard.frequency, techCard.workType);
      const maxDelayHours = getMaxDelayHours(techCard.frequency);

      try {
        await prisma.techCard.update({
          where: { id: techCard.id },
          data: {
            frequencyDays,
            preferredTime,
            maxDelayHours
          }
        });

        console.log(`✅ ${techCard.name}`);
        console.log(`   Периодичность: ${techCard.frequency} → ${frequencyDays} дней`);
        console.log(`   Время: ${preferredTime}`);
        console.log(`   Макс. задержка: ${maxDelayHours} часов\n`);

        updatedCount++;
      } catch (error) {
        console.log(`❌ Ошибка обновления ${techCard.name}: ${error.message}\n`);
      }
    }

    // Итоговая статистика
    console.log('='.repeat(50));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(50));
    console.log(`📋 Всего техкарт: ${techCards.length}`);
    console.log(`✅ Обновлено: ${updatedCount}`);
    console.log(`⏭️ Пропущено (уже обновлены): ${skippedCount}`);
    console.log(`❌ Ошибок: ${techCards.length - updatedCount - skippedCount}`);

    // Проверяем результат
    const updatedTechCards = await prisma.techCard.findMany({
      where: {
        AND: [
          { frequencyDays: { not: null } },
          { preferredTime: { not: null } },
          { maxDelayHours: { not: null } }
        ]
      }
    });

    console.log(`\n🎯 Техкарт с полными данными: ${updatedTechCards.length}`);

    // Показываем примеры обновленных техкарт
    console.log('\n📋 ПРИМЕРЫ ОБНОВЛЕННЫХ ТЕХКАРТ:');
    const examples = updatedTechCards.slice(0, 5);
    examples.forEach((tc, index) => {
      console.log(`${index + 1}. ${tc.name}`);
      console.log(`   Периодичность: ${tc.frequency} (${tc.frequencyDays} дней)`);
      console.log(`   Время: ${tc.preferredTime}, Задержка: ${tc.maxDelayHours}ч`);
    });

    console.log('\n🎉 ОБНОВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('✅ Все техкарты готовы для календаря задач');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTechCardsFrequency();
