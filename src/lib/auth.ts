import { jwtVerify } from 'jose'; // ts-restart
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

interface UserPayload {
  id: string;
  role: string;
}

export async function getAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return { user: { id: payload.userId as string, role: payload.role as string } as UserPayload };
  } catch (error) {
    return null;
  }
}

// Функция для верификации токена из NextRequest
export async function verifyToken(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return { 
      id: payload.userId as string, 
      userId: payload.userId as string,
      role: payload.role as string 
    };
  } catch (error) {
    return null;
  }
}
