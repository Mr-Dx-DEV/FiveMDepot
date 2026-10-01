'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ParticleBackground from './ParticleBackground';

export default function HeroBanner() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Particle Background */}
      <div className="absolute inset-0 bg-luxury-bg">
        <ParticleBackground />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-luxury-bg/50 to-luxury-bg" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-heading font-bold mb-6">
            <span className="gradient-text">Premium</span>
            <br />
            <span className="text-white">FiveM</span>
            <br />
            <span className="gradient-text">Assets</span>
          </h1>
        </motion.div>

        <motion.p
          className="text-xl sm:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Buy and sell the best scripts, MLOs, maps, and vehicles for your FiveM server.
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="/shop">
            <motion.button
              className="btn-primary text-lg px-8 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Assets
            </motion.button>
          </Link>
          <Link href="/auth/register">
            <motion.button
              className="px-8 py-4 rounded-lg font-medium border border-luxury-gold/30 text-luxury-gold hover:bg-luxury-gold/10 transition-all duration-300 text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Selling
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-luxury-gold/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-luxury-gold rounded-full mt-2" />
        </div>
      </motion.div>
    </section>
  );
}
