import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Маппинг для унификации периодичности
const frequencyMapping: Record<string, string> = {
  // Ежедневные
  'DAILY': 'Ежедневно',
  'Ежедневно': 'Ежедневно',
  'ежедневно': 'Ежедневно',
  'каждый день': 'Ежедневно',
  'Каждый день': 'Ежедневно',
  
  // Еженедельные
  'WEEKLY': 'Еженедельно',
  'Еженедельно': 'Еженедельно',
  'еженедельно': 'Еженедельно',
  '1 раз в неделю': 'Еженедельно',
  
  // 2 раза в неделю
  '2 раза в неделю': '2 раза в неделю',
  '2 раз в неделю': '2 раза в неделю',
  
  // 5 раз в неделю
  '5 раз в неделю': '5 раз в неделю',
  '5 раза в неделю': '5 раз в неделю',
  
  // Ежемесячные
  'MONTHLY': 'Ежемесячно',
  'Ежемесячно': 'Ежемесячно',
  'ежемесячно': 'Ежемесячно',
  '1 раз в месяц': 'Ежемесячно',
  
  // 4 раза в месяц
  '4 раза в месяц': '4 раза в месяц',
  '4 раз в месяц': '4 раза в месяц',
  
  // 2 раза в день
  '2 раза в день': '2 раза в день',
  '2 раз в день': '2 раза в день',
  
  // 2 раза в год
  '2 раза в год': '2 раза в год',
  '2 раз в год': '2 раза в год',
  
  // По мере необходимости
  'по мере необходимости': 'По мере необходимости',
  'По мере необходимости': 'По мере необходимости',
  'По мере необходимости, но не реже 1 раза в 2 суток': 'По мере необходимости (не реже 1 раза в 2 суток)',
};

async function unifyFrequency() {
  try {
    console.log('🔄 Начинаем унификацию периодичности...\n');

    let totalUpdated = 0;
    const stats: Record<string, number> = {};

    for (const [oldFreq, newFreq] of Object.entries(frequencyMapping)) {
      const result = await prisma.techCard.updateMany({
        where: { frequency: oldFreq },
        data: { frequency: newFreq }
      });

      if (result.count > 0) {
        console.log(`✅ "${oldFreq}" → "${newFreq}": ${result.count} техкарт`);
        totalUpdated += result.count;
        stats[newFreq] = (stats[newFreq] || 0) + result.count;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Всего обновлено: ${totalUpdated} техкарт\n`);
    
    console.log('Распределение по унифицированным значениям:');
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([freq, count]) => {
        console.log(`  ${freq}: ${count} техкарт`);
      });

    console.log('\n✅ Унификация завершена!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

unifyFrequency()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
