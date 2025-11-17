import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ManualSectionRecord = {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  order: number;
};

// GET /api/manual/sections - получить все разделы мануала
export async function GET(req: NextRequest) {
  try {
    const manualSectionDelegate = (prisma as any).manualSection;

    if (manualSectionDelegate?.findMany) {
      const sections = await manualSectionDelegate.findMany({
        orderBy: { order: 'asc' },
        select: {
          id: true,
          slug: true,
          title: true,
          icon: true,
          order: true
        }
      });

      return NextResponse.json(sections);
    }

    console.warn('manualSection delegate not found, using raw SQL fallback');
    const rows = await prisma.$queryRaw<ManualSectionRecord[]>`
      SELECT id, slug, title, icon, "order"
      FROM manual_sections
      ORDER BY "order" ASC
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching manual sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual sections' },
      { status: 500 }
    );
  }
}
