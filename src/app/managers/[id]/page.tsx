import { redirect } from 'next/navigation';

export default async function ManagerDetailPage() {
  // Эта страница отключена, используется модальное окно
  redirect('/managers');
}
