import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Кварта — обжарочная мастерская в Минске",
  description:
    "Обжарка специализированного кофе по четвергам партиями по 5 кг. Свежее зерно — через 1–3 дня. Подписка, разовые заказы, доставка по Минску и самовывоз.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
