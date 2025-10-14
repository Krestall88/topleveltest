import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Выход выполнен успешно' });
    
    // Удаляем cookie с токеном
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0 // Удаляем cookie
    });

    return response;
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    return NextResponse.json(
      { message: 'Ошибка при выходе' },
      { status: 500 }
    );
  }
}
