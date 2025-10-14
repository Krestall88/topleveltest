// Создание базовых данных: менеджера и инвентаря
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupBasicData() {
  try {
    console.log('🔧 Настройка базовых данных...');

    // 1. Создаем менеджера для объекта СБКК
    const hashedPassword = await bcrypt.hash('manager123', 10);
    const manager = await prisma.user.upsert({
      where: { email: 'manager.sbkk@cleaning.com' },
      update: {},
      create: {
        name: 'Менеджер СБКК',
        email: 'manager.sbkk@cleaning.com',
        password: hashedPassword,
        role: 'MANAGER',
      },
    });
    console.log('✅ Создан менеджер:', manager.name);

    // 2. Создаем базовый инвентарь для клининга
    const inventoryItems = [
      { name: 'Швабра для влажной уборки', quantity: 10, unit: 'шт', price: 350.00 },
      { name: 'Ведро пластиковое 12л', quantity: 8, unit: 'шт', price: 280.00 },
      { name: 'Тряпка микрофибра', quantity: 50, unit: 'шт', price: 120.00 },
      { name: 'Моющее средство универсальное', quantity: 20, unit: 'л', price: 180.00 },
      { name: 'Дезинфицирующее средство', quantity: 15, unit: 'л', price: 320.00 },
      { name: 'Пылесос промышленный', quantity: 3, unit: 'шт', price: 15000.00 },
      { name: 'Щетка для пола жесткая', quantity: 12, unit: 'шт', price: 250.00 },
      { name: 'Перчатки резиновые', quantity: 100, unit: 'пар', price: 45.00 },
      { name: 'Мешки для мусора 120л', quantity: 200, unit: 'шт', price: 12.00 },
      { name: 'Салфетки бумажные', quantity: 30, unit: 'упак', price: 85.00 },
      { name: 'Средство для мытья окон', quantity: 8, unit: 'л', price: 220.00 },
      { name: 'Скребок для окон', quantity: 6, unit: 'шт', price: 180.00 },
    ];

    let createdItems = 0;
    for (const itemData of inventoryItems) {
      try {
        const existingItem = await prisma.inventoryItem.findFirst({
          where: { name: itemData.name }
        });
        
        if (existingItem) {
          console.log(`ℹ️ Инвентарь уже существует: ${itemData.name}`);
          continue;
        }

        const item = await prisma.inventoryItem.create({
          data: itemData,
        });
        createdItems++;
        console.log(`✅ Инвентарь: ${item.name} (${item.quantity} ${item.unit})`);
      } catch (error) {
        console.log(`⚠️ Ошибка создания ${itemData.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Базовые данные созданы!`);
    console.log(`👤 Менеджер: ${manager.name} (${manager.email})`);
    console.log(`📦 Инвентарь: ${createdItems} позиций`);
    console.log(`\n🔑 Данные для входа менеджера:`);
    console.log(`Email: manager.sbkk@cleaning.com`);
    console.log(`Пароль: manager123`);

  } catch (error) {
    console.error('❌ Ошибка при создании базовых данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupBasicData();
