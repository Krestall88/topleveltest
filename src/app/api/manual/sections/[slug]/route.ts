import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/manual/sections/[slug] - получить конкретный раздел
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const section = await prisma.manualSection.findUnique({
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
  } catch (error) {
    console.error('Error fetching manual section:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual section' },
      { status: 500 }
    );
  }
}
