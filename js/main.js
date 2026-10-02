/* ============================================
   FiveMDepot — JavaScript
   ============================================ */

(function() {
  'use strict';

  // === Utilities ===
  function $(selector) {
    return document.querySelector(selector);
  }

  function $$(selector) {
    return document.querySelectorAll(selector);
  }

  function debounce(fn, delay) {
    let timer;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn.apply(context, args);
      }, delay);
    };
  }

  // === Navbar ===
  function initNavbar() {
    const navbar = $('#navbar');
    if (!navbar) return;

    const scrolled = function() {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', debounce(scrolled, 10), { passive: true });
    scrolled();

    // Mobile menu
    const toggle = $('#mobile-toggle');
    const menu = $('#mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function() {
        const isOpen = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on link click
      menu.querySelectorAll('.mobile-menu-link').forEach(function(link) {
        link.addEventListener('click', function() {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        });
      });

      // Close on escape
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menu.classList.contains('open')) {
          menu.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }
  }

  // === Scroll Reveal ===
  function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $$('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
        el.classList.add('revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    $$('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
      observer.observe(el);
    });
  }

  // === FAQ Accordion ===
  function initFAQ() {
    $$('.faq-question').forEach(function(question) {
      question.addEventListener('click', function() {
        const item = this.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const inner = answer.querySelector('.faq-answer-inner');
        const isActive = item.classList.contains('active');

        // Close all
        $$('.faq-item').forEach(function(faq) {
          faq.classList.remove('active');
          faq.querySelector('.faq-answer').style.maxHeight = '0';
        });

        // Open clicked if was closed
        if (!isActive) {
          item.classList.add('active');
          answer.style.maxHeight = inner.scrollHeight + 24 + 'px';
        }
      });
    });
  }

  // === Animated Counter ===
  function initCounters() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      $$('.stat-number').forEach(function(el) {
        el.textContent = el.dataset.target;
      });
      return;
    }

    function animateCounter(el) {
      const target = parseInt(el.dataset.target, 10);
      const duration = 2000;
      const start = performance.now();
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        el.textContent = prefix + current.toLocaleString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = prefix + target.toLocaleString() + suffix;
        }
      }

      requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    $$('.stat-number[data-target]').forEach(function(el) {
      observer.observe(el);
    });
  }

  // === Particles ===
  function initParticles() {
    const container = $('#hero-particles');
    if (!container) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = prefersReduced ? 0 : (window.innerWidth < 768 ? 15 : 30);

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';

      const size = 2 + Math.random() * 4;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (10 + Math.random() * 20) + 's';
      particle.style.animationDelay = Math.random() * 15 + 's';

      // Random colors
      const colors = ['var(--gold)', 'var(--cyan)', 'var(--magenta)'];
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.opacity = 0.2 + Math.random() * 0.5;

      container.appendChild(particle);
    }
  }

  // === Smooth Scroll for anchor links ===
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = $(href);
        if (target) {
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  // === Product Card Hover Tilt ===
  function initTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ('ontouchstart' in window) return;

    $$('.product-card').forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -3;
        const rotateY = (x - centerX) / centerX * 3;

        card.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
      });

      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
      });
    });
  }

  // === Cart ===
  var Cart = {
    items: [],

    init: function() {
      var stored = localStorage.getItem('fivemdepot-cart');
      if (stored) {
        try { this.items = JSON.parse(stored); } catch(e) { this.items = []; }
      }
      this.updateCount();
    },

    addItem: function(product) {
      var exists = this.items.find(function(item) { return item.id === product.id; });
      if (!exists) {
        this.items.push({
          id: product.id,
          slug: product.slug,
          title: product.title,
          price: product.price,
          image: product.image || '',
          seller: product.seller || { name: 'Unknown' }
        });
        this.save();
        this.updateCount();
        this.showToast('Added to cart', 'success');
      } else {
        this.showToast('Already in cart', 'info');
      }
    },

    removeItem: function(id) {
      this.items = this.items.filter(function(item) { return item.id !== id; });
      this.save();
      this.updateCount();
    },

    getItems: function() {
      return this.items;
    },

    getTotal: function() {
      return this.items.reduce(function(sum, item) { return sum + item.price; }, 0);
    },

    save: function() {
      localStorage.setItem('fivemdepot-cart', JSON.stringify(this.items));
    },

    updateCount: function() {
      var badge = $('.cart-count');
      if (badge) {
        badge.textContent = this.items.length;
        badge.style.display = this.items.length > 0 ? 'flex' : 'none';
      }
    },

    showToast: function(message, type) {
      var toast = $('#toast-container');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-container';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(toast);
      }

      var el = document.createElement('div');
      var colors = {
        success: 'border-l-4 border-green-500',
        error: 'border-l-4 border-red-500',
        info: 'border-l-4 border-blue-500',
        warning: 'border-l-4 border-yellow-500'
      };
      el.className = 'toast-item px-6 py-4 rounded-lg shadow-xl text-sm font-medium ' + (colors[type] || colors.info);
      el.style.cssText = colors[type] + '; background:var(--bg-card);animation:fadeInUp 0.3s ease-out;';
      el.textContent = message;
      toast.appendChild(el);

      setTimeout(function() {
        el.style.animation = 'fadeIn 0.3s ease-out reverse';
        setTimeout(function() { el.remove(); }, 300);
      }, 3000);
    }
  };

  // Make cart accessible globally
  window.FiveMDepotCart = Cart;

  // === Initialize ===
  function init() {
    Cart.init();
    initNavbar();
    initScrollReveal();
    initFAQ();
    initCounters();
    initParticles();
    initSmoothScroll();
    initTilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
