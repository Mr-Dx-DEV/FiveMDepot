import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCategoryLabel, getCategoryColor } from '@/lib/utils';
import { ProductCategory } from '@prisma/client';
import { motion } from 'framer-motion';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      seller: { select: { name: true, image: true, sellerProfile: true } },
      reviews: {
        include: {
          user: { select: { name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product || product.status !== 'PUBLISHED') {
    notFound();
  }

  const related = await prisma.product.findMany({
    where: {
      category: product.category,
      status: 'PUBLISHED',
      slug: { not: product.slug },
    },
    take: 4,
    include: { seller: { select: { name: true, image: true } } },
  });

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back link */}
        <a href="/shop" className="text-gray-400 hover:text-luxury-gold transition-colors text-sm mb-6 block">
          ← Back to Shop
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Image Gallery */}
          <div>
            <div className="glass-card rounded-2xl overflow-hidden aspect-video mb-4">
              {product.screenshots.length > 0 ? (
                <img
                  src={product.screenshots[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No preview available
                </div>
              )}
            </div>

            {product.screenshots.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {product.screenshots.map((screenshot, i) => (
                  <div
                    key={i}
                    className="w-20 h-14 shrink-0 rounded-lg overflow-hidden border border-surface-border"
                  >
                    <img src={screenshot} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div>
            <span
              className={`inline-block px-3 py-1 rounded text-xs font-medium mb-4 ${getCategoryColor(product.category)} bg-surface-input/80`}
            >
              {getCategoryLabel(product.category)}
            </span>

            <h1 className="text-4xl font-heading font-bold text-white mb-4">{product.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-luxury-gold">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= Math.round(avgRating) ? 'text-luxury-gold' : 'text-gray-600'}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-gray-400 text-sm">
                {avgRating.toFixed(1)} ({product.reviews.length} reviews)
              </span>
            </div>

            <p className="text-gray-300 leading-relaxed mb-6 whitespace-pre-wrap">
              {product.description}
            </p>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="mb-6">
                <span className="text-sm text-gray-400 mr-2">Tags:</span>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs bg-surface-input border border-surface-border text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Compatibility */}
            {product.compatibility.length > 0 && (
              <div className="mb-6">
                <span className="text-sm text-gray-400 mr-2">Compatible with:</span>
                <div className="flex flex-wrap gap-2">
                  {product.compatibility.map((c) => (
                    <span
                      key={c}
                      className="px-3 py-1 rounded text-xs bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price & CTA */}
            <div className="glass-card rounded-xl p-6 border border-luxury-gold/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Price</span>
                <span className="text-3xl font-heading font-bold gradient-text">${product.price.toFixed(2)}</span>
              </div>
              <motion.button
                className="w-full btn-primary text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Buy Now
              </motion.button>
              <p className="text-center text-gray-500 text-xs mt-3">
                Secure checkout via Bkash / Nagad / Bank Transfer
              </p>
            </div>

            {/* Seller info */}
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-input flex items-center justify-center text-gray-400">
                {product.seller.image ? (
                  <img src={product.seller.image} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  '👤'
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">Sold by</p>
                <p className="text-white font-medium">{product.seller.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {product.reviews.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-heading font-bold gradient-text mb-6">Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-surface-input flex items-center justify-center text-sm">
                      {review.user.image ? (
                        <img src={review.user.image} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <span className="text-white font-medium text-sm">{review.user.name || 'Anonymous'}</span>
                    <div className="flex text-luxury-gold text-sm">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </div>
                    <span className="text-gray-500 text-xs ml-auto">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && <p className="text-gray-300 text-sm">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-heading font-bold gradient-text mb-6">Related Assets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p) => (
                <motion.div
                  key={p.id}
                  className="glass-card rounded-xl overflow-hidden border border-surface-border hover:border-luxury-gold/30 transition-all"
                  whileHover={{ y: -4 }}
                >
                  <div className="aspect-video bg-surface-input">
                    {p.screenshots.length > 0 && (
                      <img src={p.screenshots[0]} alt={p.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-heading font-semibold text-white truncate">{p.title}</h3>
                    <span className="text-luxury-gold font-bold text-sm">${p.price.toFixed(2)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
