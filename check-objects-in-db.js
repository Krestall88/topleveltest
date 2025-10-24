const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Объекты из таблицы назначений
const assignmentObjects = [
  'ООО «Альфа» (ТЦ Мелодия)',
  'ООО "УК БИГ-БЕН"',
  'АО «ГК «Электрощит» -ТМ Самара»',
  'ООО ЧОО «Гвардеец»',
  'ПАО "БыстроБанк"',
  'ООО "УК "Юг-сервис" (Южный город)',
  'ОАО "Самарский хлебозавод №5"',
  'ООО «ПепсиКо Холдингс»',
  'Учреждение Федерации профсоюзов Самарской области санатория «Красная Глинка» (УФПСО санаторий "Красная Глинка")',
  'ООО "ЖилЭнерго" и ООО "ЖЭУ-66" (ЖК Эко-Град Волгарь)',
  'ТСЖ "Спартак"',
  'ООО "Медицина-АльфаСтрахования" (ООО "МедАС)',
  'АО "Росжелдорпроект" (АО "РЖДП")',
  'ООО «Инкатех»',
  'ФГБОУ ВО СамГМУ Минздрава России',
  'ООО «Маркет.Операции» (Яндекс)',
  'Федеральное казенное учреждение «Центр хозяйственного и сервисного обеспечения Главного управления Министерства внутренних дел Российской Федерации по Самарской области»',
  'АО "Тяжмаш"',
  'ООО "ПК Фарика Качества"',
  'АО "Фармперспектива"',
  'МБУ «Лопатинское»',
  'ООО "42"',
  'ООО "Электрощит-Инжиниринг"',
  'ООО "ЕТЭС"',
  'ООО «УК «Амонд-ЖилКомСервис»',
  'ИП Широков Дмитрий Владимирович(Автомойка )',
  'ПАО «Самараэнерго»',
  'ООО "ФЛАГМАН"',
  'ООО «НЛ Континент»',
  'ООО «Нектар»',
  'ЗАО «СБКК»',
  'ООО "БЦ "Сфера" (уборка терртории МКД возле коммерческих помещений, межквартальное обсляживание газонов)'
];

async function checkObjectsInDB() {
  console.log('🔍 Проверяем объекты в базе данных...\n');

  try {
    // Получаем все объекты из базы
    const dbObjects = await prisma.cleaningObject.findMany({
      select: {
        id: true,
        name: true,
        address: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('🏢 ОБЪЕКТЫ В БАЗЕ ДАННЫХ:');
    console.log('='.repeat(80));
    dbObjects.forEach((obj, index) => {
      console.log(`${index + 1}. "${obj.name}"`);
      if (obj.address) {
        console.log(`   📍 ${obj.address}`);
      }
      console.log('');
    });

    console.log('\n🔍 СОПОСТАВЛЕНИЕ С ТАБЛИЦЕЙ НАЗНАЧЕНИЙ:');
    console.log('='.repeat(80));

    const foundObjects = [];
    const notFoundObjects = [];

    for (const assignmentObj of assignmentObjects) {
      // Попробуем найти объект по различным критериям
      let found = false;
      
      // 1. Точное совпадение
      let dbObj = dbObjects.find(obj => obj.name === assignmentObj);
      if (dbObj) {
        found = true;
        foundObjects.push({ assignment: assignmentObj, db: dbObj.name, method: 'точное совпадение' });
      }

      // 2. Поиск по ключевым словам
      if (!found) {
        const keywords = assignmentObj.split(' ').filter(word => 
          word.length > 2 && 
          !['ООО', 'АО', 'ПАО', 'ЗАО', 'ОАО', 'ФГБОУ', 'МБУ', 'ТСЖ', 'ИП'].includes(word)
        );
        
        for (const keyword of keywords) {
          dbObj = dbObjects.find(obj => 
            obj.name.toLowerCase().includes(keyword.toLowerCase())
          );
          if (dbObj) {
            found = true;
            foundObjects.push({ assignment: assignmentObj, db: dbObj.name, method: `по ключевому слову "${keyword}"` });
            break;
          }
        }
      }

      if (!found) {
        notFoundObjects.push(assignmentObj);
      }
    }

    console.log('\n✅ НАЙДЕННЫЕ ОБЪЕКТЫ:');
    console.log('-'.repeat(80));
    foundObjects.forEach((item, index) => {
      console.log(`${index + 1}. Таблица: "${item.assignment}"`);
      console.log(`   БД: "${item.db}"`);
      console.log(`   Метод: ${item.method}`);
      console.log('');
    });

    console.log('\n❌ НЕ НАЙДЕННЫЕ ОБЪЕКТЫ:');
    console.log('-'.repeat(80));
    notFoundObjects.forEach((obj, index) => {
      console.log(`${index + 1}. "${obj}"`);
    });

    console.log('\n📊 СТАТИСТИКА:');
    console.log('='.repeat(30));
    console.log(`📋 Объектов в таблице назначений: ${assignmentObjects.length}`);
    console.log(`🏢 Объектов в базе данных: ${dbObjects.length}`);
    console.log(`✅ Найдено совпадений: ${foundObjects.length}`);
    console.log(`❌ Не найдено: ${notFoundObjects.length}`);

    // Предложения по сопоставлению
    if (notFoundObjects.length > 0) {
      console.log('\n💡 ПРЕДЛОЖЕНИЯ ПО СОПОСТАВЛЕНИЮ:');
      console.log('-'.repeat(50));
      
      for (const notFound of notFoundObjects) {
        console.log(`\n🔍 Для "${notFound}":`);
        
        // Ищем похожие объекты в базе
        const keywords = notFound.split(' ').filter(word => 
          word.length > 2 && 
          !['ООО', 'АО', 'ПАО', 'ЗАО', 'ОАО', 'ФГБОУ', 'МБУ', 'ТСЖ', 'ИП'].includes(word)
        );
        
        const suggestions = [];
        for (const keyword of keywords) {
          const matches = dbObjects.filter(obj => 
            obj.name.toLowerCase().includes(keyword.toLowerCase())
          );
          suggestions.push(...matches);
        }
        
        // Убираем дубликаты
        const uniqueSuggestions = suggestions.filter((obj, index, self) => 
          index === self.findIndex(o => o.id === obj.id)
        );
        
        if (uniqueSuggestions.length > 0) {
          console.log('   Возможные совпадения:');
          uniqueSuggestions.forEach((suggestion, i) => {
            console.log(`   ${i + 1}. "${suggestion.name}"`);
          });
        } else {
          console.log('   ❌ Похожих объектов не найдено');
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке объектов:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkObjectsInDB();
