import { jwtVerify } from 'jose'; // ts-restart
import { cookies } from 'next/headers';

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

// Заглушка для verifyToken
export async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return { userId: payload.userId as string, role: payload.role as string };
  } catch (error) {
    return null;
  }
}
