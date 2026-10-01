'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { getCategoryLabel, getCategoryColor } from '@/lib/utils';
import { ProductCategory } from '@prisma/client';

interface ProductCardProps {
  product: {
    id: string;
    slug: string;
    title: string;
    category: ProductCategory;
    price: number;
    screenshots: string[];
    seller: { name: string; image: string | null };
  };
}

function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.div
      className="glass-card rounded-xl overflow-hidden border border-surface-border hover:border-luxury-gold/30 transition-all duration-300 group"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-surface-input relative overflow-hidden">
        {product.screenshots.length > 0 ? (
          <img
            src={product.screenshots[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No preview
          </div>
        )}
        <span
          className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${getCategoryColor(product.category)} bg-surface-input/80 backdrop-blur-sm`}
        >
          {getCategoryLabel(product.category)}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-white truncate">{product.title}</h3>
        <p className="text-sm text-gray-400 mt-1">by {product.seller.name}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-luxury-gold font-bold text-lg">${product.price.toFixed(2)}</span>
          <Link href={`/shop/${product.slug}`}>
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
              View Details <span className="transition-all group-hover:translate-x-1 inline">→</span>
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeaturedProducts() {
  // TODO: Fetch from API in Phase 3
  const featuredProducts: ProductCardProps['product'][] = [];

  return (
    <section className="py-24 px-4 bg-surface-input/50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-heading font-bold gradient-text mb-4">
            Featured Assets
          </h2>
          <p className="text-gray-400 text-lg">Hand-picked quality content</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {featuredProducts.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            No featured assets yet. Check back soon!
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/shop">
            <motion.button
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View All Assets
            </motion.button>
          </Link>
        </div>
      </div>
    </section>
  );
}
