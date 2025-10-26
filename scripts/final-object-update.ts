import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Финальный маппинг для оставшихся объектов
const finalMapping: Array<{ objectId: string; newName: string }> = [
  // Объекты, которые нужно исправить
  { objectId: 'cmgyu5kkn01wfvyjoha61m1ck', newName: 'АО "Тяжмаш"' },
  { objectId: 'cmgz12a8v0001vyv85ac7mtll', newName: 'ООО «БЦ «Сфера»' },
  { objectId: 'cmgz4ol7n0001vyg4zg1h9moc', newName: 'ООО «Единые Транспортные ЭнергоСистемы» (ООО «ЕТЭС»)' },
  { objectId: 'cmgza7quz000pvyxkj8mgwdve', newName: 'ООО «Маркет.Операции» (Яндекс)' },
  { objectId: 'cmgzb2qtl0001vy7s2wczkws4', newName: 'ООО «ПепсиКо Холдингс»' },
  { objectId: 'cmgyu7ieh035fvyjogrm4ufjg', newName: 'ООО «ФЛАГМАН»' },
  { objectId: 'cmgz12qqw00advyv88zcwa5x9', newName: 'ТСЖ "Спартак"' },
  { objectId: 'cmgza7p7j0001vyxknr9n9q49', newName: 'ООО «НЛ Континент»' },
  { objectId: 'cmgz5a5jk0001vyk8y44toffc', newName: 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС")' },
];

async function finalUpdate() {
  try {
    console.log('🔄 Финальное обновление названий объектов...\n');

    let updated = 0;
    let errors = 0;

    for (const mapping of finalMapping) {
      try {
        const object = await prisma.cleaningObject.findUnique({
          where: { id: mapping.objectId },
          select: { name: true }
        });

        if (!object) {
          console.log(`⚠️ Объект ${mapping.objectId} не найден`);
          errors++;
          continue;
        }

        console.log(`🔍 "${object.name}" → "${mapping.newName}"`);

        await prisma.cleaningObject.update({
          where: { id: mapping.objectId },
          data: { name: mapping.newName }
        });

        // Обновляем objectName в задачах
        const taskResult = await prisma.task.updateMany({
          where: { objectName: object.name },
          data: { objectName: mapping.newName }
        });

        if (taskResult.count > 0) {
          console.log(`   ✅ Обновлено задач: ${taskResult.count}`);
        }

        updated++;

      } catch (error) {
        console.error(`❌ Ошибка для ${mapping.objectId}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Обновлено объектов: ${updated}/${finalMapping.length}`);
    console.log(`❌ Ошибок: ${errors}`);

    console.log('\n✅ Финальное обновление завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

finalUpdate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
