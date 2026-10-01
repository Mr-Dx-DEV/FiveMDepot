import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/login');
  }

  // Role-based routing
  const role = (session.user as { role: string }).role;

  switch (role) {
    case 'ADMIN':
      redirect('/dashboard/admin');
    case 'SELLER':
      redirect('/dashboard/seller');
    default:
      redirect('/dashboard/buyer');
  }
}
