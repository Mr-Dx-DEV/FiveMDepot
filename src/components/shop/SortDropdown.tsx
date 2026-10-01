'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

const sorts = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export default function SortDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const currentSort = searchParams.get('sort') || 'featured';

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    router.push(`/shop?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-3 rounded-lg glass-card text-sm text-gray-300 hover:text-white transition-colors"
      >
        Sort: {sorts.find((s) => s.value === currentSort)?.label || 'Featured'}
        <FaChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div
          className="absolute right-0 top-full mt-2 glass-card rounded-lg py-2 w-48 z-10"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {sorts.map((sort) => (
            <button
              key={sort.value}
              onClick={() => handleSort(sort.value)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                currentSort === sort.value
                  ? 'text-luxury-gold bg-luxury-gold/10'
                  : 'text-gray-300 hover:text-white hover:bg-surface-input'
              }`}
            >
              {sort.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
