import { NextRequest, NextResponse } from 'next/server';

// GET /api/proxy-image?url=... - Прокси для загрузки изображений из S3
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ message: 'URL не указан' }, { status: 400 });
    }

    // Проверяем, что URL от нашего S3
    if (!imageUrl.includes('s3.twcstorage.ru')) {
      return NextResponse.json({ message: 'Недопустимый URL' }, { status: 400 });
    }

    console.log('🖼️ PROXY IMAGE: Загружаем изображение:', imageUrl);

    // Загружаем изображение из S3
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error('❌ PROXY IMAGE: Ошибка загрузки:', response.status);
      return NextResponse.json({ message: 'Ошибка загрузки изображения' }, { status: response.status });
    }

    // Получаем изображение как blob
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Возвращаем изображение с правильными заголовками
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('❌ PROXY IMAGE: Ошибка:', error);
    return NextResponse.json({ 
      message: 'Ошибка сервера: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}
