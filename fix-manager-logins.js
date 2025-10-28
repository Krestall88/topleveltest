const { PrismaClient } = require('@prisma/client');

// Функция транслитерации с кириллицы на латиницу
function transliterate(text) {
  const map = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return text.replace(/[а-яёА-ЯЁ]/g, char => map[char] || char);
}

// Функция генерации логина из имени
function generateLogin(name) {
  if (!name) return 'user';
  
  // Разбиваем имя на части
  const parts = name.trim().split(/\s+/);
  
  if (parts.length >= 2) {
    // Фамилия + имя
    const lastName = parts[0];
    const firstName = parts[1];
    
    // Транслитерируем и приводим к нижнему регистру
    const lastNameLatin = transliterate(lastName).toLowerCase();
    const firstNameLatin = transliterate(firstName).toLowerCase();
    
    return `${lastNameLatin}.${firstNameLatin}`;
  } else {
    // Если только одно слово
    return transliterate(parts[0]).toLowerCase();
  }
}

async function fixManagerLogins() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ЛОГИНОВ МЕНЕДЖЕРОВ\n');
    
    // Получаем всех менеджеров с кириллическими логинами
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    const problematicManagers = managers.filter(manager => {
      const emailPart = manager.email.split('@')[0];
      return /[а-яё]/i.test(emailPart);
    });
    
    console.log(`📋 Найдено менеджеров с кириллическими логинами: ${problematicManagers.length}\n`);
    
    let fixedCount = 0;
    let errors = [];
    
    for (const manager of problematicManagers) {
      try {
        const newLogin = generateLogin(manager.name);
        const newEmail = `${newLogin}@cleaning.com`;
        
        console.log(`🔄 Исправляем: ${manager.name}`);
        console.log(`   Старый email: ${manager.email}`);
        console.log(`   Новый email: ${newEmail}`);
        
        // Проверяем, не занят ли новый email
        const existingUser = await prisma.user.findUnique({
          where: { email: newEmail }
        });
        
        if (existingUser && existingUser.id !== manager.id) {
          console.log(`   ⚠️ Email ${newEmail} уже занят, добавляем номер`);
          
          // Ищем свободный вариант с номером
          let counter = 1;
          let finalEmail = newEmail;
          
          while (true) {
            finalEmail = `${newLogin}${counter}@cleaning.com`;
            const checkUser = await prisma.user.findUnique({
              where: { email: finalEmail }
            });
            
            if (!checkUser) break;
            counter++;
            
            if (counter > 100) {
              throw new Error('Не удалось найти свободный email');
            }
          }
          
          newEmail = finalEmail;
          console.log(`   Итоговый email: ${newEmail}`);
        }
        
        // Обновляем email
        await prisma.user.update({
          where: { id: manager.id },
          data: { email: newEmail }
        });
        
        console.log(`   ✅ Успешно обновлен\n`);
        fixedCount++;
        
      } catch (error) {
        console.log(`   ❌ Ошибка: ${error.message}\n`);
        errors.push({
          manager: manager.name,
          error: error.message
        });
      }
    }
    
    console.log(`\n📊 РЕЗУЛЬТАТЫ:`);
    console.log(`✅ Исправлено: ${fixedCount} менеджеров`);
    console.log(`❌ Ошибок: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Ошибки:`);
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.manager}: ${err.error}`);
      });
    }
    
    // Проверяем результат
    console.log(`\n🔍 Проверка результата...`);
    const remainingProblematic = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        email: {
          contains: 'а' // Проверяем наличие кириллицы
        }
      }
    });
    
    console.log(`Осталось менеджеров с кириллицей: ${remainingProblematic.length}`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixManagerLogins();
