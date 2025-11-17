import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/manual/sections - получить все разделы мануала
export async function GET(req: NextRequest) {
  try {
    const sections = await prisma.manualSection.findMany({
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
  } catch (error) {
    console.error('Error fetching manual sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual sections' },
      { status: 500 }
    );
  }
}
