import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/storage';

// POST /api/upload - Загрузка файлов в облачное хранилище (Timeweb S3)
export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ message: 'Файл не найден' }, { status: 400 });
    }

    // uploadImage уже проверяет тип и размер файла
    const fileUrl = await uploadImage(file);

    return NextResponse.json({ 
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    const message = error instanceof Error ? error.message : 'Ошибка при загрузке файла';
    return NextResponse.json({ message }, { status: 500 });
  }
}
