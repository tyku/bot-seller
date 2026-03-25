import type { Metadata } from 'next';
import { DemoPage } from '@/components/demo/DemoPage';

export const metadata: Metadata = {
  title: 'Демо — Bot Seller',
  description: 'Попробуйте настройки бота без регистрации',
};

export default function DemoRoutePage() {
  return <DemoPage />;
}
