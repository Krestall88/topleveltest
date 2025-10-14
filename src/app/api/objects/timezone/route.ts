import { NextRequest, NextResponse } from 'next/server';

// Простая карта городов и их часовых поясов для России
const TIMEZONE_MAP: Record<string, string> = {
  // Московское время (UTC+3)
  'москва': 'Europe/Moscow',
  'санкт-петербург': 'Europe/Moscow',
  'нижний новгород': 'Europe/Moscow',
  'воронеж': 'Europe/Moscow',
  'волгоград': 'Europe/Moscow',
  'ростов-на-дону': 'Europe/Moscow',
  'краснодар': 'Europe/Moscow',
  'самара': 'Europe/Samara', // UTC+4
  
  // Екатеринбургское время (UTC+5)
  'екатеринбург': 'Asia/Yekaterinburg',
  'челябинск': 'Asia/Yekaterinburg',
  'пермь': 'Asia/Yekaterinburg',
  'уфа': 'Asia/Yekaterinburg',
  
  // Омское время (UTC+6)
  'омск': 'Asia/Omsk',
  'новосибирск': 'Asia/Novosibirsk',
  
  // Красноярское время (UTC+7)
  'красноярск': 'Asia/Krasnoyarsk',
  
  // Иркутское время (UTC+8)
  'иркутск': 'Asia/Irkutsk',
  
  // Якутское время (UTC+9)
  'якутск': 'Asia/Yakutsk',
  
  // Владивостокское время (UTC+10)
  'владивосток': 'Asia/Vladivostok',
  'хабаровск': 'Asia/Vladivostok',
  
  // Магаданское время (UTC+11)
  'магадан': 'Asia/Magadan',
  
  // Камчатское время (UTC+12)
  'петропавловск-камчатский': 'Asia/Kamchatka',
};

// POST /api/objects/timezone - Определить часовой пояс по адресу
export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ message: 'Адрес обязателен' }, { status: 400 });
    }

    console.log('🌍 Определение часового пояса для адреса:', address);

    // Простое определение по ключевым словам в адресе
    const addressLower = address.toLowerCase();
    let timezone = 'Europe/Moscow'; // По умолчанию московское время

    // Ищем совпадения в адресе
    for (const [city, tz] of Object.entries(TIMEZONE_MAP)) {
      if (addressLower.includes(city)) {
        timezone = tz;
        console.log(`✅ Найден город ${city}, часовой пояс: ${timezone}`);
        break;
      }
    }

    // В реальном проекте здесь был бы вызов к геокодинг API
    // const geocodeResult = await fetch(`https://api.geocoding.com/v1/geocode?address=${encodeURIComponent(address)}`);
    // const { lat, lng } = await geocodeResult.json();
    // const timezoneResult = await fetch(`https://api.timezone.com/v1/timezone?lat=${lat}&lng=${lng}`);
    // const { timezone } = await timezoneResult.json();

    return NextResponse.json({
      address,
      timezone,
      source: 'city_mapping', // В реальности было бы 'geocoding_api'
      confidence: addressLower.includes('москва') || addressLower.includes('санкт-петербург') ? 'high' : 'medium'
    });

  } catch (error) {
    console.error('❌ Ошибка определения часового пояса:', error);
    return NextResponse.json(
      { message: 'Ошибка определения часового пояса', timezone: 'Europe/Moscow' }, 
      { status: 500 }
    );
  }
}
