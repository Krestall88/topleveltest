import { Metadata } from 'next';
import CreateObjectForm from '@/components/CreateObjectForm';

export const metadata: Metadata = {
  title: 'Создание объекта | Клининг-Контроль',
  description: 'Создание нового объекта с помещениями и техкартами',
};

export default function CreateObjectPage() {
  return <CreateObjectForm />;
}
