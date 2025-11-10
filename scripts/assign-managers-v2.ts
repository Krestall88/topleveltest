import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface Assignment {
  object: string;
  site: string;
  manager: string;
  phone: string;
  senior: string;
  seniorPhone: string;
}

async function findManager(name: string) {
  if (!name) return null;
  
  const manager = await prisma.user.findFirst({
    where: {
      name: { contains: name, mode: 'insensitive' },
      role: { in: ['MANAGER', 'SENIOR_MANAGER'] }
    }
  });
  
  return manager;
}

async function main() {
  console.log('🚀 Начинаем назначение менеджеров...\n');
  
  // Читаем данные из JSON
  const dataPath = path.join(__dirname, 'managers-data.json');
  const data: Assignment[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  for (const item of data) {
    try {
      // Ищем объект
      const object = await prisma.cleaningObject.findFirst({
        where: {
          name: { contains: item.object, mode: 'insensitive' }
        },
        include: { sites: true }
      });
      
      if (!object) {
        errors.push(`❌ Объект не найден: ${item.object}`);
        failed++;
        continue;
      }
      
      // Ищем менеджера
      const manager = await findManager(item.manager);
      if (!manager) {
        errors.push(`❌ Менеджер не найден: ${item.manager} для ${item.object}`);
        failed++;
        continue;
      }
      
      // Ищем старшего менеджера (если указан)
      let seniorManager = null;
      if (item.senior) {
        seniorManager = await findManager(item.senior);
        if (!seniorManager) {
          errors.push(`⚠️  Старший менеджер не найден: ${item.senior} для ${item.object}`);
        }
      }
      
      // Если участок не указан - назначаем на виртуальный участок
      if (!item.site || item.site.trim() === '') {
        // Ищем виртуальный участок
        const virtualSite = object.sites.find(s => s.name.includes('__VIRTUAL__'));
        
        if (virtualSite) {
          await prisma.site.update({
            where: { id: virtualSite.id },
            data: {
              managerId: manager.id,
              seniorManagerId: seniorManager?.id || null
            }
          });
          
          console.log(`✅ ${object.name} → виртуальный участок → ${manager.name}${seniorManager ? ` (Старший: ${seniorManager.name})` : ''}`);
          success++;
        } else {
          errors.push(`⚠️  Виртуальный участок не найден для: ${item.object}`);
          failed++;
        }
        continue;
      }
      
      // Ищем конкретный участок
      const site = object.sites.find(s => 
        s.name.toLowerCase().includes(item.site.toLowerCase()) ||
        item.site.toLowerCase().includes(s.name.toLowerCase())
      );
      
      if (!site) {
        errors.push(`❌ Участок не найден: "${item.site}" в объекте ${item.object}`);
        failed++;
        continue;
      }
      
      // Назначаем менеджера на участок
      await prisma.site.update({
        where: { id: site.id },
        data: {
          managerId: manager.id,
          seniorManagerId: seniorManager?.id || null
        }
      });
      
      console.log(`✅ ${object.name} → ${site.name} → ${manager.name}${seniorManager ? ` (Старший: ${seniorManager.name})` : ''}`);
      success++;
      
    } catch (error) {
      errors.push(`❌ Ошибка обработки: ${item.object} - ${error}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 ИТОГО:`);
  console.log(`✅ Успешно: ${success}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📝 Всего записей: ${data.length}\n`);
  
  if (errors.length > 0) {
    console.log('⚠️  ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ:\n');
    errors.forEach(err => console.log(err));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
