import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateTechCards() {
  console.log('🔍 ПОИСК И УДАЛЕНИЕ ДУБЛИКАТОВ ТЕХКАРТ\n');
  
  // Находим все техкарты, которые привязаны И к объекту уборки И напрямую к помещению
  // (это дубликаты - должны быть только в объекте уборки)
  
  const allTechCards = await prisma.techCard.findMany({
    where: {
      cleaningObjectItemId: { not: null }
    },
    include: {
      room: true,
      cleaningObjectItem: true
    }
  });
  
  console.log(`📊 Найдено техкарт с объектами уборки: ${allTechCards.length}\n`);
  
  // Группируем по помещению и названию
  const groupedByRoom = new Map<string, Map<string, any[]>>();
  
  allTechCards.forEach(tc => {
    if (!tc.roomId) return;
    
    if (!groupedByRoom.has(tc.roomId)) {
      groupedByRoom.set(tc.roomId, new Map());
    }
    
    const roomMap = groupedByRoom.get(tc.roomId)!;
    const key = `${tc.name}:${tc.frequency}`;
    
    if (!roomMap.has(key)) {
      roomMap.set(key, []);
    }
    
    roomMap.get(key)!.push(tc);
  });
  
  console.log('🔍 Анализ дубликатов...\n');
  
  let duplicatesFound = 0;
  const toDelete: string[] = [];
  
  // Ищем дубликаты: одинаковые техкарты в одном помещении
  for (const [roomId, techCardsMap] of groupedByRoom) {
    for (const [key, techCards] of techCardsMap) {
      if (techCards.length > 1) {
        duplicatesFound++;
        console.log(`❌ Дубликат найден:`);
        console.log(`   Помещение: ${techCards[0].room?.name || 'неизвестно'}`);
        console.log(`   Техкарта: ${techCards[0].name}`);
        console.log(`   Количество копий: ${techCards.length}`);
        
        // Оставляем первую, остальные удаляем
        const [keep, ...duplicates] = techCards;
        console.log(`   ✅ Оставляем: ID ${keep.id}`);
        
        duplicates.forEach(dup => {
          console.log(`   🗑️  Удаляем: ID ${dup.id}`);
          toDelete.push(dup.id);
        });
        
        console.log();
      }
    }
  }
  
  if (toDelete.length === 0) {
    console.log('✅ Дубликатов не найдено!\n');
    await prisma.$disconnect();
    return;
  }
  
  console.log('='.repeat(70));
  console.log(`🗑️  УДАЛЕНИЕ ${toDelete.length} ДУБЛИКАТОВ...\n`);
  
  const deleted = await prisma.techCard.deleteMany({
    where: {
      id: { in: toDelete }
    }
  });
  
  console.log(`✅ Удалено техкарт: ${deleted.count}\n`);
  
  console.log('='.repeat(70));
  console.log('✅ ОЧИСТКА ЗАВЕРШЕНА!');
  console.log('='.repeat(70));
  console.log(`\n📊 Итого:`);
  console.log(`   Найдено групп дубликатов: ${duplicatesFound}`);
  console.log(`   Удалено техкарт: ${deleted.count}\n`);
  
  await prisma.$disconnect();
}

removeDuplicateTechCards().catch(console.error);
