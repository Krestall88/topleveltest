import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('💾 СОЗДАНИЕ РЕЗЕРВНОЙ КОПИИ ДАННЫХ\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // Создаем папку для бэкапов
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backup: any = {
    timestamp,
    objects: [],
    sites: [],
    zones: [],
    roomGroups: [],
    rooms: [],
    cleaningItems: [],
    techCards: [],
  };
  
  console.log('📦 Экспортируем данные...\n');
  
  // Экспортируем объекты
  backup.objects = await prisma.cleaningObject.findMany({
    include: {
      manager: { select: { name: true, email: true } },
      creator: { select: { name: true, email: true } }
    }
  });
  console.log(`✅ Объекты: ${backup.objects.length}`);
  
  // Экспортируем участки
  backup.sites = await prisma.site.findMany({
    include: {
      manager: { select: { name: true, email: true } },
      object: { select: { name: true } }
    }
  });
  console.log(`✅ Участки: ${backup.sites.length}`);
  
  // Экспортируем зоны
  backup.zones = await prisma.zone.findMany({
    include: {
      site: { select: { name: true } }
    }
  });
  console.log(`✅ Зоны: ${backup.zones.length}`);
  
  // Экспортируем группы помещений
  backup.roomGroups = await prisma.roomGroup.findMany({
    include: {
      zone: { select: { name: true } }
    }
  });
  console.log(`✅ Группы помещений: ${backup.roomGroups.length}`);
  
  // Экспортируем помещения
  backup.rooms = await prisma.room.findMany({
    include: {
      object: { select: { name: true } },
      roomGroup: { select: { name: true } }
    }
  });
  console.log(`✅ Помещения: ${backup.rooms.length}`);
  
  // Экспортируем объекты уборки
  backup.cleaningItems = await prisma.cleaningObjectItem.findMany({
    include: {
      room: { select: { name: true } }
    }
  });
  console.log(`✅ Объекты уборки: ${backup.cleaningItems.length}`);
  
  // Экспортируем техкарты
  backup.techCards = await prisma.techCard.findMany({
    include: {
      object: { select: { name: true } },
      room: { select: { name: true } },
      cleaningObjectItem: { select: { name: true } }
    }
  });
  console.log(`✅ Техкарты: ${backup.techCards.length}`);
  
  // Сохраняем в JSON
  const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  
  console.log(`\n💾 Резервная копия сохранена: ${backupPath}`);
  console.log(`📊 Размер файла: ${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
