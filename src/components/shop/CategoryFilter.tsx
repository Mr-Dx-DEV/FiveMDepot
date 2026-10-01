'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryFilterProps {
  categories: Category[];
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="font-heading font-semibold text-white mb-4">Categories</h3>
      <div className="space-y-2">
        {categories.map((cat) => {
          const isActive = currentCategory === cat.slug;
          return (
            <Link key={cat.id} href={`/shop?category=${cat.slug}`}>
              <motion.div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30'
                    : 'text-gray-400 hover:text-white hover:bg-surface-input'
                }`}
                whileHover={{ x: 4 }}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-luxury-gold' : 'bg-gray-600'}`} />
                {cat.name}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
