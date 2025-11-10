import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listSites() {
  const object = await prisma.cleaningObject.findFirst({
    where: {
      name: {
        contains: 'Электрощит',
        mode: 'insensitive'
      }
    },
    include: {
      sites: {
        include: {
          zones: true
        }
      }
    }
  });
  
  if (!object) {
    console.log('Объект не найден');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Объект: ${object.name}\n`);
  console.log(`Участков: ${object.sites.length}\n`);
  
  object.sites.forEach((site, i) => {
    console.log(`${i + 1}. "${site.name}"`);
    console.log(`   Зон: ${site.zones.length}`);
    site.zones.forEach((zone, zi) => {
      console.log(`   ${zi + 1}. "${zone.name}"`);
    });
    console.log();
  });
  
  await prisma.$disconnect();
}

listSites().catch(console.error);
