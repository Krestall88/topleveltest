import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelRow {
  'наименование объекта': string;
  'адрес': string;
  'участок': string | null;
  'зона': string | null;
  'группа помещений': string | null;
  'помещение': string | null;
  'Объект уборки': string;
  'тех задание': string;
  'периодичность': string;
  'примечания': string | null;
  'период': string | null;
  'Менеджер объекта ФИО': string;
  'Телефон': number;
  'Старший менеджер объекта ФИО': string | null;
  'Телефон.1': number | null;
}

// Утилита для нормализации строк
function normalize(str: string | null | undefined): string | null {
  if (!str || str.trim() === '' || str.trim() === ' ') return null;
  return str.trim();
}

// Утилита для форматирования телефона
function formatPhone(phone: number | null | undefined): string | null {
  if (!phone) return null;
  return phone.toString();
}

async function main() {
  console.log('🚀 НАЧАЛО МИГРАЦИИ ДАННЫХ\n');
  
  // Читаем JSON
  const jsonPath = path.join(__dirname, '..', 'objects-data.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: ExcelRow[] = JSON.parse(rawData);
  
  console.log(`📊 Загружено строк: ${data.length}\n`);
  
  // Статистика
  const stats = {
    objectsCreated: 0,
    objectsUpdated: 0,
    sitesCreated: 0,
    zonesCreated: 0,
    roomGroupsCreated: 0,
    roomsCreated: 0,
    cleaningItemsCreated: 0,
    techCardsCreated: 0,
    managersCreated: 0,
    managersUpdated: 0,
    errors: [] as string[],
  };
  
  // Кэш для избежания дубликатов
  const objectCache = new Map<string, string>(); // name -> id
  const siteCache = new Map<string, string>(); // objectId:siteName -> id
  const zoneCache = new Map<string, string>(); // siteId:zoneName -> id
  const roomGroupCache = new Map<string, string>(); // zoneId:groupName -> id
  const roomCache = new Map<string, string>(); // objectId:roomName -> id
  const cleaningItemCache = new Map<string, string>(); // roomId:itemName -> id
  const managerCache = new Map<string, string>(); // name -> id
  
  try {
    // ШАГ 1: Создаем/обновляем менеджеров
    console.log('👥 ШАГ 1: Создание/обновление менеджеров...\n');
    
    const uniqueManagers = new Map<string, { name: string; phone: string | null }>();
    const uniqueSeniorManagers = new Map<string, { name: string; phone: string | null }>();
    
    for (const row of data) {
      const managerName = normalize(row['Менеджер объекта ФИО']);
      const managerPhone = formatPhone(row['Телефон']);
      
      if (managerName && !uniqueManagers.has(managerName)) {
        uniqueManagers.set(managerName, { name: managerName, phone: managerPhone });
      }
      
      const seniorName = normalize(row['Старший менеджер объекта ФИО']);
      const seniorPhone = formatPhone(row['Телефон.1']);
      
      if (seniorName && !uniqueSeniorManagers.has(seniorName)) {
        uniqueSeniorManagers.set(seniorName, { name: seniorName, phone: seniorPhone });
      }
    }
    
    console.log(`Найдено уникальных менеджеров: ${uniqueManagers.size}`);
    console.log(`Найдено уникальных старших менеджеров: ${uniqueSeniorManagers.size}\n`);
    
    // Объединяем всех менеджеров
    const allManagers = new Map([...uniqueManagers, ...uniqueSeniorManagers]);
    
    for (const [name, { phone }] of allManagers) {
      try {
        // Проверяем существует ли менеджер
        const existing = await prisma.user.findFirst({
          where: { name }
        });
        
        if (existing) {
          // Обновляем телефон если нужно
          if (phone && existing.phone !== phone) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { phone }
            });
            stats.managersUpdated++;
            console.log(`  ✏️  Обновлен: ${name} (${phone})`);
          }
          managerCache.set(name, existing.id);
        } else {
          // Создаем нового менеджера
          const email = `${name.toLowerCase().replace(/\s+/g, '.')}@temp.com`;
          const newManager = await prisma.user.create({
            data: {
              name,
              email,
              password: '$2a$10$defaulthash', // Временный хеш
              role: 'MANAGER',
              phone
            }
          });
          managerCache.set(name, newManager.id);
          stats.managersCreated++;
          console.log(`  ✅ Создан: ${name} (${phone})`);
        }
      } catch (error: any) {
        stats.errors.push(`Ошибка создания менеджера ${name}: ${error.message}`);
        console.error(`  ❌ Ошибка: ${name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Менеджеры обработаны: создано ${stats.managersCreated}, обновлено ${stats.managersUpdated}\n`);
    
    // ШАГ 2: Создаем/обновляем объекты
    console.log('🏢 ШАГ 2: Создание/обновление объектов...\n');
    
    const uniqueObjects = new Map<string, { name: string; address: string | null }>();
    
    for (const row of data) {
      const objectName = normalize(row['наименование объекта']);
      const address = normalize(row['адрес']);
      
      if (objectName && !uniqueObjects.has(objectName)) {
        uniqueObjects.set(objectName, { name: objectName, address });
      }
    }
    
    console.log(`Найдено уникальных объектов: ${uniqueObjects.size}\n`);
    
    // Получаем ID администратора для creatorId
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!admin) {
      throw new Error('❌ Не найден администратор в системе!');
    }
    
    for (const [name, { address }] of uniqueObjects) {
      try {
        const existing = await prisma.cleaningObject.findFirst({
          where: { name }
        });
        
        if (existing) {
          // Обновляем адрес если нужно
          if (address && existing.address !== address) {
            await prisma.cleaningObject.update({
              where: { id: existing.id },
              data: { address }
            });
            stats.objectsUpdated++;
            console.log(`  ✏️  Обновлен: ${name}`);
          }
          objectCache.set(name, existing.id);
        } else {
          // Создаем новый объект
          const newObject = await prisma.cleaningObject.create({
            data: {
              name,
              address: address || 'Не указан',
              creatorId: admin.id,
              workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            }
          });
          objectCache.set(name, newObject.id);
          stats.objectsCreated++;
          console.log(`  ✅ Создан: ${name}`);
        }
      } catch (error: any) {
        stats.errors.push(`Ошибка создания объекта ${name}: ${error.message}`);
        console.error(`  ❌ Ошибка: ${name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Объекты обработаны: создано ${stats.objectsCreated}, обновлено ${stats.objectsUpdated}\n`);
    
    console.log('⏸️  ПАУЗА: Проверьте данные перед продолжением...\n');
    console.log('Для продолжения раскомментируйте код ниже\n');
    
    // TODO: Продолжить с созданием участков, зон, помещений и техкарт
    
  } catch (error: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  } finally {
    // Выводим статистику
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:\n');
    console.log(`Объекты: создано ${stats.objectsCreated}, обновлено ${stats.objectsUpdated}`);
    console.log(`Участки: создано ${stats.sitesCreated}`);
    console.log(`Зоны: создано ${stats.zonesCreated}`);
    console.log(`Группы помещений: создано ${stats.roomGroupsCreated}`);
    console.log(`Помещения: создано ${stats.roomsCreated}`);
    console.log(`Объекты уборки: создано ${stats.cleaningItemsCreated}`);
    console.log(`Техкарты: создано ${stats.techCardsCreated}`);
    console.log(`Менеджеры: создано ${stats.managersCreated}, обновлено ${stats.managersUpdated}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Ошибки (${stats.errors.length}):\n`);
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
