import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { UserRole } from '@prisma/client';

export default async function AdminDashboard() {
  await requireRole([UserRole.ADMIN]);

  const stats = await Promise.all([
    prisma.user.count(),
    prisma.product.count({ where: { status: 'PUBLISHED' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
    prisma.order.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
  ]);

  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING' },
    take: 10,
    include: {
      buyer: { select: { name: true, email: true } },
      product: { select: { title: true } },
    },
  });

  const pendingSellers = await prisma.sellerProfile.findMany({
    where: { status: 'PENDING' },
    take: 10,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-heading font-bold gradient-text mb-2">Admin Panel</h1>
        <p className="text-gray-400 mb-8">Manage your marketplace</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Users</p>
            <p className="text-3xl font-heading font-bold gradient-text">{stats[0]}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Products</p>
            <p className="text-3xl font-heading font-bold text-neon-cyan">{stats[1]}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Pending Orders</p>
            <p className="text-3xl font-heading font-bold text-yellow-400">{stats[2]}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Pending Sellers</p>
            <p className="text-3xl font-heading font-bold text-orange-400">{stats[3]}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Revenue</p>
            <p className="text-3xl font-heading font-bold text-luxury-gold">
              ${stats[4]._sum.amount?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Orders */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-heading font-bold text-white mb-4">Pending Verifications</h2>
            {pendingOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">All caught up!</p>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-input/50 border border-surface-border"
                  >
                    <div>
                      <p className="text-white text-sm">{order.product.title}</p>
                      <p className="text-gray-400 text-xs">{order.buyer.name}</p>
                    </div>
                    <span className="text-luxury-gold text-sm font-bold">${order.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Sellers */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-heading font-bold text-white mb-4">Pending Seller Applications</h2>
            {pendingSellers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending applications</p>
            ) : (
              <div className="space-y-3">
                {pendingSellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-input/50 border border-surface-border"
                  >
                    <div>
                      <p className="text-white text-sm">{seller.user.name}</p>
                      <p className="text-gray-400 text-xs">{seller.user.email}</p>
                    </div>
                    <span className="text-orange-400 text-xs">{seller.discordTag || 'No Discord'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="glass-card rounded-xl p-6 mt-8">
          <h2 className="font-heading font-bold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a href="/dashboard/admin/orders" className="btn-outline">
              Manage Orders
            </a>
            <a href="/dashboard/admin/sellers" className="btn-outline">
              Manage Sellers
            </a>
            <a href="/dashboard/admin/products" className="btn-outline">
              Manage Products
            </a>
            <a href="/dashboard/admin/settings" className="btn-outline">
              Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
