import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bot Seller - Создайте продающего бота',
  description: 'Платформа для создания и управления продающими ботами в Telegram и VK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
