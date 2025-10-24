const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAssignments() {
  console.log('🔍 Проверяем текущие назначения менеджеров...\n');
  
  try {
    // Проверяем Юг-сервис
    console.log('📋 ЮГ-СЕРВИС:');
    const yugObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'Юг-сервис',
          mode: 'insensitive'
        }
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true }
        },
        sites: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
    
    yugObjects.forEach((obj, index) => {
      console.log(`\n${index + 1}. Объект: ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Основной менеджер: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Участков: ${obj.sites.length}`);
      
      obj.sites.forEach((site, siteIndex) => {
        console.log(`   ${siteIndex + 1}. Участок: ${site.name}`);
        console.log(`      Менеджер: ${site.manager?.name || 'НЕ НАЗНАЧЕН'}`);
        console.log(`      Комментарий: ${site.comment || 'НЕТ'}`);
      });
    });
    
    // Проверяем ПепсиКо
    console.log('\n\n📋 ПЕПСИКО:');
    const pepsiObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'ПепсиКо',
          mode: 'insensitive'
        }
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true }
        },
        sites: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
    
    pepsiObjects.forEach((obj, index) => {
      console.log(`\n${index + 1}. Объект: ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Основной менеджер: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Участков: ${obj.sites.length}`);
      
      obj.sites.forEach((site, siteIndex) => {
        console.log(`   ${siteIndex + 1}. Участок: ${site.name}`);
        console.log(`      Менеджер: ${site.manager?.name || 'НЕ НАЗНАЧЕН'}`);
        console.log(`      Комментарий: ${site.comment || 'НЕТ'}`);
      });
    });
    
    // Проверяем Электрощит
    console.log('\n\n📋 ЭЛЕКТРОЩИТ:');
    const electroObjects = await prisma.cleaningObject.findMany({
      where: {
        name: {
          contains: 'ЭЛЕКТРОЩИТ',
          mode: 'insensitive'
        }
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true }
        },
        sites: {
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
    
    electroObjects.forEach((obj, index) => {
      console.log(`\n${index + 1}. Объект: ${obj.name}`);
      console.log(`   ID: ${obj.id}`);
      console.log(`   Основной менеджер: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
      console.log(`   Участков: ${obj.sites.length}`);
      
      obj.sites.forEach((site, siteIndex) => {
        console.log(`   ${siteIndex + 1}. Участок: ${site.name}`);
        console.log(`      Менеджер: ${site.manager?.name || 'НЕ НАЗНАЧЕН'}`);
        console.log(`      Комментарий: ${site.comment || 'НЕТ'}`);
      });
    });
    
    // Проверяем все объекты с несколькими менеджерами
    console.log('\n\n📋 ОБЪЕКТЫ С НЕСКОЛЬКИМИ МЕНЕДЖЕРАМИ:');
    const objectsWithMultipleManagers = await prisma.cleaningObject.findMany({
      where: {
        sites: {
          some: {
            managerId: {
              not: null
            }
          }
        }
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true }
        },
        sites: {
          where: {
            managerId: {
              not: null
            }
          },
          include: {
            manager: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
    
    objectsWithMultipleManagers.forEach((obj, index) => {
      if (obj.sites.length > 0) {
        console.log(`\n${index + 1}. ${obj.name}`);
        console.log(`   Основной: ${obj.manager?.name || 'НЕ НАЗНАЧЕН'}`);
        console.log(`   Участков с менеджерами: ${obj.sites.length}`);
        
        obj.sites.forEach((site, siteIndex) => {
          console.log(`   ${siteIndex + 1}. ${site.name} → ${site.manager?.name} (${site.comment || 'без комментария'})`);
        });
      }
    });
    
  } catch (error) {
    console.error('💥 Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAssignments();
