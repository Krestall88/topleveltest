const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Маппинг русских email на английские
const emailMapping = {
  'кобзева.анна@cleaning.com': 'kobzeva.anna@cleaning.com',
  'шодиева.мухарамгуля@cleaning.com': 'shodieva.mukharamgulya@cleaning.com',
  'будкова.светлана@cleaning.com': 'budkova.svetlana@cleaning.com',
  'нувальцева.мария@cleaning.com': 'nuvaltseva.maria@cleaning.com',
  'гордеев.роман@cleaning.com': 'gordeev.roman@cleaning.com',
  'соколова.ольга@cleaning.com': 'sokolova.olga@cleaning.com',
  'бобровская.елена@cleaning.com': 'bobrovskaya.elena@cleaning.com',
  'брагина.катерина@cleaning.com': 'bragina.katerina@cleaning.com',
  'тимохина.анна@cleaning.com': 'timokhina.anna@cleaning.com',
  'напольская.людмила@cleaning.com': 'napolskaya.lyudmila@cleaning.com',
  'ласкин.павел@cleaning.com': 'laskin.pavel@cleaning.com',
  'васекин.александр@cleaning.com': 'vasekin.aleksandr@cleaning.com',
  'галиев.рустам@cleaning.com': 'galiev.rustam@cleaning.com',
  'ягода.ирина@cleaning.com': 'yagoda.irina@cleaning.com',
  'пленкина.наталья@cleaning.com': 'plenkina.natalya@cleaning.com',
  'гайнуллина.айна@cleaning.com': 'gaynullina.ayna@cleaning.com',
  'исайчева.маргарита@cleaning.com': 'isaycheva.margarita@cleaning.com',
  'штельмашенко.ирина@cleaning.com': 'shtelmashenko.irina@cleaning.com',
  'халидова.лилия@cleaning.com': 'khalidova.liliya@cleaning.com',
  'крапивко.лариса@cleaning.com': 'krapivko.larisa@cleaning.com'
};

async function fixManagerEmails() {
  try {
    console.log('🔄 Начинаем обновление email менеджеров...');
    
    // Получаем всех менеджеров
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true, name: true, email: true }
    });
    
    console.log(`📋 Найдено менеджеров: ${managers.length}`);
    
    let updatedCount = 0;
    
    for (const manager of managers) {
      const newEmail = emailMapping[manager.email];
      
      if (newEmail) {
        console.log(`🔄 Обновляем ${manager.name}: ${manager.email} → ${newEmail}`);
        
        try {
          await prisma.user.update({
            where: { id: manager.id },
            data: { email: newEmail }
          });
          
          updatedCount++;
          console.log(`✅ Обновлен: ${manager.name}`);
        } catch (error) {
          console.error(`❌ Ошибка обновления ${manager.name}:`, error.message);
        }
      } else {
        console.log(`⏭️ Пропускаем ${manager.name} (${manager.email}) - нет маппинга`);
      }
    }
    
    console.log(`\n🎉 Готово! Обновлено менеджеров: ${updatedCount} из ${managers.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixManagerEmails();
