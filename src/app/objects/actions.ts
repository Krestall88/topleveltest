'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createObject(formData: FormData) {
  const name = formData.get('name') as string;
  const address = formData.get('address') as string;

  if (!name || !address) {
    return { error: 'Название и адрес обязательны для заполнения.' };
  }

  try {
    await prisma.cleaningObject.create({
      data: {
        name,
        address,
        // TODO: Get creatorId from session
        creatorId: 'c9d4c4d8-b4b1-4c4e-9c0e-6b4b4b4b4b4b', // Placeholder
      },
    });
    revalidatePath('/objects');
    return { success: true };
  } catch (error) {
    return { error: 'Не удалось создать объект.' };
  }
}

export async function updateObject(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const address = formData.get('address') as string;

  if (!name || !address) {
    return { error: 'Название и адрес обязательны для заполнения.' };
  }

  try {
    await prisma.cleaningObject.update({
      where: { id },
      data: { name, address },
    });
    revalidatePath('/objects');
    revalidatePath(`/objects/${id}`);
    return { success: true };
  } catch (error) {
    return { error: 'Не удалось обновить объект.' };
  }
}

export async function deleteObject(id: string) {
  try {
    await prisma.cleaningObject.delete({ where: { id } });
    revalidatePath('/objects');
    return { success: true };
  } catch (error) {
    return { error: 'Не удалось удалить объект.' };
  }
}
