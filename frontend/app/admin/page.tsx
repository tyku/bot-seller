import type { Metadata } from 'next';
import { AdminPage } from '@/components/admin/AdminPage';

export const metadata: Metadata = {
  title: 'Админ — Bot Seller',
  description: 'Административная страница',
};

export default function AdminRoutePage() {
  return <AdminPage />;
}
