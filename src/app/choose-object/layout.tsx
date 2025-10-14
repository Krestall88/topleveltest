import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Выбор объекта - Клининговая система",
  description: "Выберите объект для обслуживания",
};

export default function ChooseObjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Скрипт Telegram WebApp */}
      <script src="https://telegram.org/js/telegram-web-app.js" async />
      {children}
    </>
  );
}
