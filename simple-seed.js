const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Исправление проблемы с входом...');

    // 1. Проверяем и создаем .env.local
    if (!fs.existsSync('.env.local')) {
      const jwtSecret = crypto.randomBytes(32).toString('hex');
      const envContent = `JWT_SECRET="${jwtSecret}"\nDATABASE_URL="file:./dev.db"\n`;
      fs.writeFileSync('.env.local', envContent);
      console.log('✅ Создан .env.local');
    }

    // 2. Удаляем дублирующего админа
    await prisma.user.deleteMany({
      where: { email: 'admin@example.com' }
    });
    console.log('🗑️ Удален дублирующий админ');

    // 3. Проверяем основного админа
    let admin = await prisma.user.findUnique({
      where: { email: 'admin@cleaning.com' }
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          name: 'Администратор',
          email: 'admin@cleaning.com',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('✅ Создан администратор');
    } else {
      console.log('✅ Администратор существует');
    }

    // 4. Проверяем пароль
    const passwordCheck = await bcrypt.compare('admin123', admin.password);
    console.log(`🔐 Пароль admin123: ${passwordCheck ? 'OK' : 'ОШИБКА'}`);

    console.log('\n🎯 Данные для входа:');
    console.log('Email: admin@cleaning.com');
    console.log('Пароль: admin123');
    console.log('\n⚠️ Перезапустите сервер если проблема остается');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
          managerId: admin.id,
          creatorId: admin.id,
        }
      });

      console.log('✅ Объекты созданы');
    } else {
      console.log(`ℹ️ Объекты уже существуют (${objects.length} шт.)`);
    }

    // Добавляем инвентарь
    const inventory = await prisma.inventoryItem.findMany();
    if (inventory.length === 0) {
      console.log('Создаем базовый инвентарь...');
      
      await prisma.inventoryItem.createMany({
        data: [
          { name: 'Моющее средство универсальное', quantity: 50, unit: 'л', price: 150.00 },
          { name: 'Салфетки микрофибра', quantity: 100, unit: 'шт', price: 25.00 },
          { name: 'Пакеты для мусора 120л', quantity: 200, unit: 'шт', price: 15.00 },
        ]
      });

      console.log('✅ Инвентарь создан');
    } else {
      console.log(`ℹ️ Инвентарь уже существует (${inventory.length} позиций)`);
    }

    console.log('🎉 Готово!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addTestData();
