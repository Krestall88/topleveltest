import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type ManualSectionRecord = {
  id: string;
  slug: string;
  title: string;
  icon: string | null;
  order: number;
  content: string;
};

// GET /api/manual/sections/[slug] - получить конкретный раздел
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const manualSectionDelegate = (prisma as any).manualSection;

    if (manualSectionDelegate?.findUnique) {
      const section = await manualSectionDelegate.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          icon: true,
          order: true,
          content: true
        }
      });

      if (!section) {
        return NextResponse.json(
          { error: 'Section not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(section);
    }

    console.warn('manualSection delegate not found, using raw SQL fallback for slug');
    const rows = await prisma.$queryRaw<ManualSectionRecord[]>`
      SELECT id, slug, title, icon, "order", content
      FROM manual_sections
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error fetching manual section:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual section' },
      { status: 500 }
    );
  }
}
