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

export default function ProductCard({ product }: ProductCardProps) {
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
