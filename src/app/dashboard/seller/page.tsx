import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import Link from 'next/link';

export default async function SellerDashboard() {
  const user = await requireAuth();

  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const totalEarnings = await prisma.order.aggregate({
    where: {
      userId: user.id,
      status: 'COMPLETED',
    },
    _sum: { amount: true },
  });

  const pendingProducts = await prisma.product.count({
    where: { userId: user.id, status: 'PUBLISHED' },
  });

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
              Seller Dashboard
            </h1>
            <p className="text-gray-400">Manage your assets and earnings</p>
          </div>
          <Link href="/dashboard/seller/products/new">
            <motion.button
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              + New Asset
            </motion.button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total Products</p>
            <p className="text-3xl font-heading font-bold gradient-text">{pendingProducts}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total Earnings</p>
            <p className="text-3xl font-heading font-bold text-luxury-gold">
              ${totalEarnings._sum.amount?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Total Downloads</p>
            <p className="text-3xl font-heading font-bold text-neon-cyan">
              {products.reduce((sum, p) => sum + p.downloads, 0)}
            </p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <p className="text-gray-400 text-sm">Wallet Balance</p>
            <p className="text-3xl font-heading font-bold text-neon-magenta">
              ${user.walletBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Products */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="font-heading font-bold text-white mb-4">Your Products</h2>
          {products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No products yet. Start selling!</p>
              <Link href="/dashboard/seller/products/new" className="btn-primary inline-block mt-4">
                Upload Your First Asset
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-input/50 border border-surface-border"
                >
                  <div>
                    <p className="text-white font-medium">{product.title}</p>
                    <p className="text-gray-400 text-sm">{product.downloads} downloads</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.status === 'PUBLISHED'
                          ? 'bg-green-500/20 text-green-400'
                          : product.status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {product.status}
                    </span>
                    <span className="text-luxury-gold font-bold">${product.price.toFixed(2)}</span>
                    <Link href={`/shop/${product.slug}`} className="text-gray-400 hover:text-white text-sm">
                      View
                    </Link>
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
