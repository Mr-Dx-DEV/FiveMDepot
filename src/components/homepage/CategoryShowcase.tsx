'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaCode, FaMapMarkedAlt, FaCar } from 'react-icons/fa';

const categories = [
  {
    name: 'Scripts',
    slug: 'script',
    icon: FaCode,
    description: 'Ready-to-use scripts for your server',
    count: '120+ assets',
    gradient: 'from-luxury-gold/20 to-luxury-gold/5',
    borderColor: 'border-luxury-gold/30',
    hoverColor: 'hover:border-luxury-gold',
  },
  {
    name: 'MLOs & Maps',
    slug: 'mlo',
    icon: FaMapMarkedAlt,
    description: 'Custom interiors and exterior maps',
    count: '80+ assets',
    gradient: 'from-neon-cyan/20 to-neon-cyan/5',
    borderColor: 'border-neon-cyan/30',
    hoverColor: 'hover:border-neon-cyan',
  },
  {
    name: 'Vehicles',
    slug: 'vehicle',
    icon: FaCar,
    description: 'High-quality custom vehicles',
    count: '200+ assets',
    gradient: 'from-neon-magenta/20 to-neon-magenta/5',
    borderColor: 'border-neon-magenta/30',
    hoverColor: 'hover:border-neon-magenta',
  },
];

export default function CategoryShowcase() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-heading font-bold gradient-text mb-4">
            Browse Categories
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Find exactly what your server needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              className={`glass-card rounded-2xl p-8 border ${cat.borderColor} ${cat.hoverColor} transition-all duration-300 group cursor-pointer`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -8 }}
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-6`}>
                <cat.icon className="text-3xl text-white" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-white mb-2">{cat.name}</h3>
              <p className="text-gray-400 mb-2">{cat.description}</p>
              <p className="text-sm text-luxury-gold mb-6">{cat.count}</p>
              <Link href={`/shop?category=${cat.slug}`}>
                <span className="inline-flex items-center gap-2 text-luxury-gold font-medium group-hover:gap-3 transition-all">
                  Browse <span className="transition-all">→</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
