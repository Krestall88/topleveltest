const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const object = await prisma.cleaningObject.findFirst({
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

    if (!object) {
      console.log('Объект не найден');
      return;
    }

    console.log(`Объект: ${object.name} (${object.id})`);
    console.log(`Техкарт: ${object.techCards.length}`);

    const summary = {};
    for (const card of object.techCards) {
      const site = card.room?.roomGroup?.zone?.site?.name || card.cleaningObjectItem?.room?.roomGroup?.zone?.site?.name;
      const zone = card.room?.roomGroup?.zone?.name || card.cleaningObjectItem?.room?.roomGroup?.zone?.name;
      const roomGroup = card.room?.roomGroup?.name || card.cleaningObjectItem?.room?.roomGroup?.name;
      const roomName = card.room?.name || card.cleaningObjectItem?.room?.name;

      const key = `${card.name}__${site || 'NO_SITE'}__${zone || 'NO_ZONE'}__${roomGroup || 'NO_GROUP'}__${roomName || 'NO_ROOM'}`;
      summary[key] = summary[key] || [];
      summary[key].push(card.id);
    }

    const duplicates = Object.entries(summary).filter(([_, ids]) => ids.length > 1);
    console.log(`Найдено групп дублей: ${duplicates.length}`);
    duplicates.slice(0, 20).forEach(([key, ids]) => {
      console.log('\nДубль:', key);
      console.log('IDs:', ids);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
