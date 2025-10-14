import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// POST /api/upload - Загрузка файлов (временная реализация для локальной разработки)
export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ message: 'Файл не найден' }, { status: 400 });
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Разрешены только изображения' }, { status: 400 });
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'Файл слишком большой (максимум 10MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Сохраняем в папку public/uploads (для локальной разработки)
    const path = join(process.cwd(), 'public', 'uploads', filename);
    await writeFile(path, buffer);

    // Возвращаем URL файла
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ 
      url: fileUrl,
      filename,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return NextResponse.json({ message: 'Ошибка при загрузке файла' }, { status: 500 });
  }
}
