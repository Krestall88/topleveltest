import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Заглушка для authOptions
export const authOptions = {
  providers: [],
  callbacks: {},
  pages: {}
};

// Заглушка для NextAuth API роута
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: 'Auth error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: 'Auth error' }, { status: 500 });
  }
}
