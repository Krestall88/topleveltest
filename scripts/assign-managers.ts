import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Данные из списка пользователя
const assignments = [
  { object: '«Желдорпроект Поволжья» - филиала АО «Росжелдорпроект»', site: null, manager: 'Васекин Александр Александрович', senior: null },
  { object: 'АО "Тяжмаш"', site: null, manager: null, senior: 'Тимохина Анна Анатольевна' },
  { object: 'АО "Тяжмаш"', site: null, manager: null, senior: 'Гайнуллина Айна Алиевна' },
  { object: 'АО «ГК «Электрощит» -ТМ Самара»', site: 'Административное здание Заводоуправления', manager: 'Исайчева Маргарита Николаевна', senior: null },
  { object: 'АО «ГК «Электрощит» -ТМ Самара»', site: 'дополнительные услуги заказчика', manager: 'Исайчева Маргарита Николаевна', senior: null },
  { object: 'АО «ГК «Электрощит» -ТМ Самара»', site: 'ПЛОЩАДКА «РУССКИЙ ТРАНСФОРМАТОР» 15 300м2 цеха 83, 81, 82', manager: 'Гайнуллина Айна Алиевна', senior: null },
  { object: 'АО «ГК «Электрощит» -ТМ Самара»', site: 'ПЛОЩАДКА КРАСНАЯ ГЛИНКА 141 601.15', manager: 'Гайнуллина Айна Алиевна', senior: null },
  { object: 'АО «ГК «Электрощит» -ТМ Самара»', site: 'помещение Административного здания', manager: 'Исайчева Маргарита Николаевна', senior: null },
  { object: 'АО «ГК «Электрощит» -ТМ Самара»', site: 'спортивный комплекс «Энергия» 2115,30м.2', manager: 'Исайчева Маргарита Николаевна', senior: null },
  { object: 'ЗАО  «СБКК»', site: null, manager: null, senior: 'Соколова Ольга Константиновна' },
  { object: 'ИП Широков Дмитрий Владимирович (автосервис)', site: null, manager: null, senior: 'Штельмашенко Ирина Николаевна' },
  { object: 'МБУ «Лопатинское»', site: null, manager: null, senior: 'Штельмашенко Ирина Николаевна' },
  { object: 'ОАО "Самарский хлебозавод №5"', site: null, manager: null, senior: 'Напольская Людмила Петровна' },
  { object: 'ООО "42"', site: null, manager: null, senior: 'Пленкина Наталья Алексеевна' },
  { object: 'ООО "ЖилЭнерго" и ООО "ЖЭУ-66" (ЖК Эко-Град Волгарь)', site: 'Места общего пользования', manager: 'Галиев Рустам Рафикович', senior: null },
  { object: 'ООО "ЖилЭнерго" и ООО "ЖЭУ-66" (ЖК Эко-Град Волгарь)', site: 'Придомовая территория', manager: 'Васекин Александр Александрович', senior: null },
  { object: 'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)', site: null, manager: null, senior: 'Козюлина Алла Геннадьевна' },
  { object: 'ООО "ПК Фарика Качества"', site: null, manager: null, senior: 'Крапивко Лариса Владимировна' },
  { object: 'ООО "ПК Фарика Качества"', site: null, manager: null, senior: 'Исайчева Маргарита Николаевна' },
];

async function main() {
  console.log('🚀 Начинаем привязку менеджеров...\n');

  for (const assignment of assignments) {
    try {
      // Ищем объект
      const cleaningObject = await prisma.cleaningObject.findFirst({
        where: { name: { contains: assignment.object, mode: 'insensitive' } }
      });

      if (!cleaningObject) {
        console.log(`⚠️  Объект не найден: ${assignment.object}`);
        continue;
      }

      // Если указан участок
      if (assignment.site) {
        const site = await prisma.site.findFirst({
          where: {
            objectId: cleaningObject.id,
            name: { contains: assignment.site, mode: 'insensitive' }
          }
        });

        if (!site) {
          console.log(`⚠️  Участок не найден: ${assignment.site} в объекте ${assignment.object}`);
          continue;
        }

        // Привязываем менеджера к участку
        if (assignment.manager) {
          const manager = await prisma.user.findFirst({
            where: {
              name: { contains: assignment.manager, mode: 'insensitive' },
              role: { in: ['MANAGER', 'SENIOR_MANAGER'] }
            }
          });

          if (manager) {
            await prisma.site.update({
              where: { id: site.id },
              data: { managerId: manager.id }
            });
            console.log(`✅ ${assignment.object} / ${assignment.site} → ${manager.name}`);
          } else {
            console.log(`⚠️  Менеджер не найден: ${assignment.manager}`);
          }
        }

        // Привязываем старшего менеджера к участку
        if (assignment.senior) {
          const senior = await prisma.user.findFirst({
            where: {
              name: { contains: assignment.senior, mode: 'insensitive' },
              role: { in: ['MANAGER', 'SENIOR_MANAGER'] }
            }
          });

          if (senior) {
            await prisma.site.update({
              where: { id: site.id },
              data: { seniorManagerId: senior.id }
            });
            console.log(`👔 ${assignment.object} / ${assignment.site} → ст.менеджер ${senior.name}`);
          } else {
            console.log(`⚠️  Старший менеджер не найден: ${assignment.senior}`);
          }
        }
      } else {
        // Привязываем к объекту целиком
        if (assignment.senior) {
          const senior = await prisma.user.findFirst({
            where: {
              name: { contains: assignment.senior, mode: 'insensitive' },
              role: { in: ['MANAGER', 'SENIOR_MANAGER'] }
            }
          });

          if (senior) {
            await prisma.cleaningObject.update({
              where: { id: cleaningObject.id },
              data: { managerId: senior.id }
            });
            console.log(`✅ ${assignment.object} → ${senior.name}`);
          } else {
            console.log(`⚠️  Старший менеджер не найден: ${assignment.senior}`);
          }
        }

        if (assignment.manager) {
          const manager = await prisma.user.findFirst({
            where: {
              name: { contains: assignment.manager, mode: 'insensitive' },
              role: { in: ['MANAGER', 'SENIOR_MANAGER'] }
            }
          });

          if (manager) {
            await prisma.cleaningObject.update({
              where: { id: cleaningObject.id },
              data: { managerId: manager.id }
            });
            console.log(`✅ ${assignment.object} → ${manager.name}`);
          } else {
            console.log(`⚠️  Менеджер не найден: ${assignment.manager}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка при обработке: ${assignment.object}`, error);
    }
  }

  console.log('\n✅ Привязка завершена!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
