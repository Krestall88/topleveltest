const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  try {
    const objects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        techCards: {
          include: {
            room: {
              include: {
                roomGroup: {
                  include: {
                    zone: {
                      include: {
                        site: true
                      }
                    }
                  }
                }
              }
            },
            cleaningObjectItem: {
              include: {
                room: {
                  include: {
                    roomGroup: {
                      include: {
                        zone: {
                          include: {
                            site: true
                          }
                        }
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

    console.log(`Найдено объектов: ${objects.length}`);

    const results = [];

    for (const object of objects) {
      const groups = {};
      for (const card of object.techCards) {
        const site = card.room?.roomGroup?.zone?.site?.name || card.cleaningObjectItem?.room?.roomGroup?.zone?.site?.name || 'NO_SITE';
        const zone = card.room?.roomGroup?.zone?.name || card.cleaningObjectItem?.room?.roomGroup?.zone?.name || 'NO_ZONE';
        const roomGroup = card.room?.roomGroup?.name || card.cleaningObjectItem?.room?.roomGroup?.name || 'NO_GROUP';
        const room = card.room?.name || card.cleaningObjectItem?.room?.name || 'NO_ROOM';
        const key = `${card.name}__${site}__${zone}__${roomGroup}__${room}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(card.id);
      }
      const duplicates = Object.entries(groups).filter(([_, ids]) => ids.length > 1);
      if (duplicates.length > 0) {
        results.push({ object, duplicates });
      }
    }

    if (results.length === 0) {
      console.log('Дубли техкарт не обнаружены ни на одном объекте Юг-сервис.');
    } else {
      results.forEach(({ object, duplicates }) => {
        console.log(`\nОбъект: ${object.name}`);
        duplicates.forEach(([key, ids]) => {
          console.log(`  Дубль ${key}`);
          console.log(`  IDs: ${ids.join(', ')}`);
        });
      });
    }
  } catch (err) {
    console.error('Ошибка анализа:', err);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
