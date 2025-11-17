import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ManualScreenshotRecord = {
  id: string;
  number: number;
  filename: string;
  description: string;
  alt: string;
};

// GET /api/manual/screenshots - получить все скриншоты
export async function GET(req: NextRequest) {
  try {
    const manualScreenshotDelegate = (prisma as any).manualScreenshot;

    if (manualScreenshotDelegate?.findMany) {
      const screenshots = await manualScreenshotDelegate.findMany({
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
    }

    console.warn('manualScreenshot delegate not found, using raw SQL fallback');
    const rows = await prisma.$queryRaw<ManualScreenshotRecord[]>`
      SELECT id, number, filename, description, alt
      FROM manual_screenshots
      ORDER BY number ASC
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching manual screenshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual screenshots' },
      { status: 500 }
    );
  }
}
