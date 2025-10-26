import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Маппинг старых и новых названий
const nameMapping: Array<{ oldName: string; newName: string }> = [
  { oldName: 'ООО “БЦ «Сфера”', newName: 'ООО «БЦ «Сфера»' },
  { oldName: 'Волгарь(ЖилЭнерго,ЖЭУ-66)', newName: 'ООО "ЖилЭнерго" и ООО "ЖЭУ-66" (ЖК Эко-Град Волгарь)' },
  { oldName: 'ООО фирма «Нектар»', newName: 'ООО «Нектар»' },
  { oldName: 'ООО «УК «Амонд-ЖилКомСервис»', newName: 'ООО «УК «Амонд-ЖилКомСервис»' },
  { oldName: 'ОАО «Самарский хлебозавод №5»', newName: 'ОАО «Самарский хлебозавод №5»' },
  { oldName: 'МБУ «Лопатинское»', newName: 'МБУ «Лопатинское»' },
  { oldName: 'ООО «Единые Транспортные ЭнергоСистемы» (ЕТЭС)', newName: 'ООО «Единые Транспортные ЭнергоСистемы» (ООО «ЕТЭС»)' },
  { oldName: 'ООО «ИНКАТЕХ»', newName: 'ООО «Инкатех»' },
  { oldName: 'ИП Широков Дмитрий Владимирович (автосервис)', newName: 'ИП Широков Дмитрий Владимирович (автосервис)' },
  { oldName: 'КОМПАКТИВ', newName: 'ООО "УК БИГ-БЕН"' },
  { oldName: 'Медицина АльфаСтрахования МедАС', newName: 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)' },
  { oldName: 'ООО «НЛ Континент» 144,2  м2', newName: 'ООО «НЛ Континент»' },
  { oldName: 'ООО «Маркет.Операции»', newName: 'ООО «Маркет.Операции» (Яндекс)' },
  { oldName: 'ООО ЧОО Гвардеец', newName: 'ООО ЧОО «Гвардеец»' },
  { oldName: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «Электрощит-Инжиниринг» 407,2м2.', newName: 'ООО "Электрощит-Инжиниринг"' },
  { oldName: 'Пепси 1 515 кв. м.', newName: 'ООО «ПепсиКо Холдингс»' },
  { oldName: '«Желдорпроект Поволжья» - филиала АО «Росжелдорпроект» 1302,5 кв. м', newName: '«Желдорпроект Поволжья» - филиала АО «Росжелдорпроект»' },
  { oldName: 'Самараэнерго 429,2 кв. м.', newName: 'ПАО «Самараэнерго»' },
  { oldName: 'Товарищество собственников жилья «Спартак» (ТСЖ «Спартак»)', newName: 'ТСЖ "Спартак"' },
  { oldName: 'Акционерное общество “ТЯЖМАШ” АО “ТЯЖМАШ', newName: 'АО "Тяжмаш"' },
  { oldName: 'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»', newName: 'ООО «Производственная компания ФАБРИКА КАЧЕСТВА»' },
  { oldName: 'ЗАО «ГК «ЭЛЕКТРОЩИТ» ТМ САМАРА»  159 968.55 м2', newName: 'ЗАО «ГК «Электрощит» -ТМ Самара»' },
  { oldName: 'ПАО «БыстроБанк»', newName: 'ПАО «БыстроБанк»' },
  { oldName: 'ООО 42 45,20 М2', newName: 'ООО "42"' },
  { oldName: 'ООО «Альфа» 1100 м2', newName: 'ООО «Альфа» (ТЦ Мелодия)' },
  { oldName: 'ФГБОУ ВО СамГМУ Минздрава России', newName: 'ФГБОУ ВО СамГМУ Минздрава России' },
  { oldName: 'ООО «ФЛАГМАН»', newName: 'ООО «ФЛАГМАН»' },
  { oldName: 'УФПСО санаторий «Красная Глинка»', newName: 'УФПСО санаторий «Красная Глинка»' },
  { oldName: 'УК Юг-сервис', newName: 'ООО "УК "Юг-сервис" (Южный город)' },
];

async function generateMapping() {
  try {
    console.log('🔍 Поиск объектов в базе данных...\n');

    const result = [];
    const notFound = [];
    const multipleFound = [];

    for (const mapping of nameMapping) {
      // Ищем объект по старому названию (с учетом возможных вариаций)
      const searchVariants = [
        mapping.oldName,
        mapping.oldName.trim(),
        mapping.oldName.replace(/\s+/g, ' ').trim(),
      ];

      let foundObjects: any[] = [];
      
      for (const variant of searchVariants) {
        const objects = await prisma.cleaningObject.findMany({
          where: {
            name: {
              contains: variant,
              mode: 'insensitive'
            }
          },
          select: {
            id: true,
            name: true,
            manager: {
              select: {
                name: true
              }
            },
            _count: {
              select: {
                techCards: true,
                rooms: true,
                checklists: true
              }
            }
          }
        });

        if (objects.length > 0) {
          foundObjects = objects;
          break;
        }
      }

      if (foundObjects.length === 0) {
        console.log(`❌ Не найден: "${mapping.oldName}"`);
        notFound.push(mapping.oldName);
      } else if (foundObjects.length > 1) {
        console.log(`⚠️ Найдено несколько (${foundObjects.length}): "${mapping.oldName}"`);
        foundObjects.forEach(obj => {
          console.log(`   - ${obj.id}: ${obj.name}`);
        });
        multipleFound.push({ mapping, objects: foundObjects });
        
        // Добавляем все найденные объекты
        foundObjects.forEach(obj => {
          result.push({
            objectId: obj.id,
            oldName: obj.name,
            newName: mapping.newName,
            managerName: obj.manager?.name || 'Не назначен',
            techCardsCount: obj._count.techCards,
            roomsCount: obj._count.rooms,
            checklistsCount: obj._count.checklists
          });
        });
      } else {
        const obj = foundObjects[0];
        console.log(`✅ Найден: "${mapping.oldName}" → "${mapping.newName}"`);
        console.log(`   ID: ${obj.id}`);
        console.log(`   Менеджер: ${obj.manager?.name || 'Не назначен'}`);
        console.log(`   Техкарт: ${obj._count.techCards}, Помещений: ${obj._count.rooms}\n`);
        
        result.push({
          objectId: obj.id,
          oldName: obj.name,
          newName: mapping.newName,
          managerName: obj.manager?.name || 'Не назначен',
          techCardsCount: obj._count.techCards,
          roomsCount: obj._count.rooms,
          checklistsCount: obj._count.checklists
        });
      }
    }

    // Сохраняем результат
    const outputPath = path.join(__dirname, 'object-names.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(60));
    console.log('📊 СТАТИСТИКА:');
    console.log('='.repeat(60));
    console.log(`✅ Найдено и готово к обновлению: ${result.length}`);
    console.log(`❌ Не найдено в БД: ${notFound.length}`);
    console.log(`⚠️ Найдено несколько вариантов: ${multipleFound.length}`);
    
    if (notFound.length > 0) {
      console.log('\n❌ НЕ НАЙДЕНЫ В БД:');
      notFound.forEach(name => console.log(`   - ${name}`));
      console.log('\n💡 Проверьте точное написание в базе данных');
    }

    if (multipleFound.length > 0) {
      console.log('\n⚠️ НАЙДЕНО НЕСКОЛЬКО ОБЪЕКТОВ:');
      multipleFound.forEach(item => {
        console.log(`\n   "${item.mapping.oldName}"`);
        item.objects.forEach(obj => {
          console.log(`   - ${obj.id}: ${obj.name}`);
        });
      });
      console.log('\n💡 Проверьте файл object-names.json и при необходимости удалите дубликаты');
    }

    console.log(`\n✅ Файл сохранен: ${outputPath}`);
    console.log('\n📝 Следующий шаг: npm run update-object-names');

  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateMapping()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
