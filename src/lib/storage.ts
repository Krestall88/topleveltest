import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Инициализация S3 клиента для Timeweb Cloud
const s3Client = process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
  ? new S3Client({
      region: process.env.S3_REGION || 'ru-1',
      endpoint: process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // Важно для S3-совместимых хранилищ
    })
  : null;

/**
 * Загружает файл в облачное хранилище (Timeweb S3) или локально
 * @param file - Файл для загрузки
 * @param folder - Папка в bucket (например, 'photos', 'documents', 'voice')
 * @returns URL загруженного файла
 */
export async function uploadFileToStorage(
  file: File,
  folder: string = 'uploads'
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Генерируем уникальное имя файла
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
  const filePath = `${folder}/${filename}`;

  // Если настроен S3 - загружаем в облако
  if (s3Client && process.env.S3_BUCKET_NAME) {
    try {
      console.log('📤 Загрузка файла в Timeweb S3:', {
        bucket: process.env.S3_BUCKET_NAME,
        key: filePath,
        size: file.size,
        type: file.type,
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: filePath,
          Body: buffer,
          ContentType: file.type,
          ACL: 'public-read', // Публичный доступ к файлам
        })
      );

      // Формируем публичный URL файла
      // Для Timeweb Cloud правильный формат: https://bucket.s3.endpoint/path
      const bucketName = process.env.S3_BUCKET_NAME;
      const endpoint = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru';
      
      // Убираем https:// из endpoint для формирования URL
      const endpointWithoutProtocol = endpoint.replace('https://', '').replace('http://', '');
      
      // Формат URL для Timeweb: https://bucket-name.endpoint/path
      const fileUrl = `https://${bucketName}.${endpointWithoutProtocol}/${filePath}`;
      
      console.log('✅ Файл успешно загружен в S3:', fileUrl);
      
      return fileUrl;
    } catch (error) {
      console.error('❌ Ошибка загрузки в S3:', error);
      // Если не удалось загрузить в S3, падаем на локальное хранилище
      console.warn('⚠️ Переключение на локальное хранилище...');
    }
  }

  // Локальное хранилище (fallback для разработки)
  console.log('📁 Загрузка файла локально (S3 не настроен)');
  
  const uploadsDir = join(process.cwd(), 'public', 'uploads', folder);
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    // Папка уже существует
  }

  const localPath = join(uploadsDir, filename);
  await writeFile(localPath, buffer);

  const fileUrl = `/uploads/${folder}/${filename}`;
  console.log('✅ Файл сохранён локально:', fileUrl);
  
  return fileUrl;
}

/**
 * Загружает изображение в хранилище
 */
export async function uploadImage(file: File): Promise<string> {
  console.log('📸 STORAGE: Загрузка изображения:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    console.error('❌ STORAGE: Неверный тип файла:', file.type);
    throw new Error('Разрешены только изображения');
  }

  // Проверяем размер файла (максимум 10MB)
  if (file.size > 10 * 1024 * 1024) {
    console.error('❌ STORAGE: Файл слишком большой:', file.size);
    throw new Error('Файл слишком большой (максимум 10MB)');
  }

  console.log('✅ STORAGE: Проверки пройдены, загружаем в S3...');
  return uploadFileToStorage(file, 'photos');
}

/**
 * Загружает документ в хранилище
 */
export async function uploadDocument(file: File): Promise<string> {
  // Проверяем размер файла (максимум 20MB)
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Файл слишком большой (максимум 20MB)');
  }

  return uploadFileToStorage(file, 'documents');
}

/**
 * Загружает голосовое сообщение в хранилище
 */
export async function uploadVoice(file: File): Promise<string> {
  // Проверяем размер файла (максимум 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Файл слишком большой (максимум 5MB)');
  }

  return uploadFileToStorage(file, 'voice');
}
