import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkElektroshit() {
  console.log('🔍 ПРОВЕРКА ОБЪЕКТА "Электрощит"\n');
  
  const objects = await prisma.cleaningObject.findMany({
    where: {
      name: {
        contains: 'Электрощит',
        mode: 'insensitive'
      }
    },
    include: {
      sites: {
        include: {
          zones: {
            include: {
              roomGroups: {
                include: {
                  rooms: {
                    include: {
                      cleaningObjects: true,
                      techCards: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  
  console.log(`📊 Найдено объектов: ${objects.length}\n`);
  
  objects.forEach((obj, i) => {
    console.log(`${i + 1}. ${obj.name}`);
    console.log(`   ID: ${obj.id}`);
    console.log(`   Участков: ${obj.sites.length}\n`);
    
    obj.sites.forEach((site, si) => {
      console.log(`   ${si + 1}. Участок: ${site.name} (ID: ${site.id})`);
      console.log(`      Зон: ${site.zones.length}\n`);
      
      site.zones.forEach((zone, zi) => {
        console.log(`      ${zi + 1}. Зона: ${zone.name} (ID: ${zone.id})`);
        console.log(`         Групп: ${zone.roomGroups.length}`);
        
        if (zone.roomGroups.length === 0) {
          console.log(`         ⚠️  ПУСТАЯ ЗОНА - нет групп помещений!\n`);
        } else {
          zone.roomGroups.forEach((group, gi) => {
            console.log(`         ${gi + 1}. Группа: ${group.name}`);
            console.log(`            Помещений: ${group.rooms.length}`);
          });
          console.log();
        }
      });
    });
  });
  
  await prisma.$disconnect();
}

checkElektroshit().catch(console.error);
