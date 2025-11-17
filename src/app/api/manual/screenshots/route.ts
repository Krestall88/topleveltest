import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/manual/screenshots - получить все скриншоты
export async function GET(req: NextRequest) {
  try {
    const screenshots = await prisma.manualScreenshot.findMany({
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        filename: true,
        description: true,
        alt: true
      }
    });

    return NextResponse.json(screenshots);
  } catch (error) {
    console.error('Error fetching manual screenshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual screenshots' },
      { status: 500 }
    );
  }
}
