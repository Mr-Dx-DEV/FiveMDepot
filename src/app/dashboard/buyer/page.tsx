import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import Link from 'next/link';
import { getOrderStatusColor } from '@/lib/utils';

export default async function BuyerDashboard() {
  const user = await requireAuth();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { title: true, slug: true, category: true, price: true } },
    },
    take: 20,
  });

  const completedOrders = await prisma.order.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    select: { downloadCode: true, product: { select: { title: true } } },
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
          Buyer Dashboard
        </h1>
        <p className="text-gray-400 mb-8">Manage your purchases and downloads</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats */}
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total Purchases</p>
            <p className="text-3xl font-heading font-bold gradient-text">{orders.length}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Completed</p>
            <p className="text-3xl font-heading font-bold text-neon-cyan">
              {completedOrders.length}
            </p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Wallet Balance</p>
            <p className="text-3xl font-heading font-bold text-luxury-gold">
              ${user.walletBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Orders */}
        <div className="glass-card rounded-xl p-6 mb-8">
          <h2 className="font-heading font-bold text-white mb-4">Order History</h2>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No purchases yet</p>
              <Link href="/shop" className="btn-primary inline-block mt-4">
                Browse Assets
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-input/50 border border-surface-border"
                >
                  <div>
                    <p className="text-white font-medium">{order.product.title}</p>
                    <p className="text-gray-400 text-sm">Order #{order.id.slice(0, 8)}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-luxury-gold font-bold">${order.amount.toFixed(2)}</span>
                    {order.status === 'COMPLETED' && order.downloadCode && (
                      <Link
                        href={`/download/${order.downloadCode}`}
                        className="text-neon-cyan hover:underline text-sm"
                      >
                        Download
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    VERIFIED: 'bg-green-500/20 text-green-400',
    REJECTED: 'bg-red-500/20 text-red-400',
    COMPLETED: 'bg-neon-cyan/20 text-neon-cyan',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400';
}
