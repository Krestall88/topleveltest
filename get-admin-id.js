const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getAdminId() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (admin) {
      console.log(`Admin ID: ${admin.id}`);
      console.log(`Admin name: ${admin.name}`);
      console.log(`Admin email: ${admin.email}`);
    } else {
      console.log('Admin not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAdminId();
