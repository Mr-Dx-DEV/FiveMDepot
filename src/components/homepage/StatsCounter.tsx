'use client';

import { motion } from 'framer-motion';

interface StatItemProps {
  value: number;
  suffix: string;
  label: string;
}

function StatItem({ value, suffix, label }: StatItemProps) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-5xl font-heading font-bold gradient-text mb-2">
        {value.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-400">{label}</div>
    </motion.div>
  );
}

export default function StatsCounter() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <StatItem value={400} suffix="+" label="Assets" />
        <StatItem value={1200} suffix="+" label="Happy Buyers" />
        <StatItem value={200} suffix="+" label="Sellers" />
        <StatItem value={50} suffix="+" label="Countries" />
      </div>
    </section>
  );
}
