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

  // ============================================
  // Premium Feature Utilities
  // ============================================

  // Wishlist Manager
  window.Wishlist = {
    async toggle(productId) {
      try {
        const res = await fetch('api/wishlist.php?action=is_in_wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId })
        });
        const data = await res.json();
        if (data.in_wishlist) {
          await fetch('api/wishlist.php?action=remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
          });
          return false;
        } else {
          await fetch('api/wishlist.php?action=add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
          });
          return true;
        }
      } catch (e) { console.error('Wishlist error:', e); return false; }
    },
    async check(productId) {
      try {
        const res = await fetch('api/wishlist.php?action=is_in_wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId })
        });
        const data = await res.json();
        return data.in_wishlist || false;
      } catch (e) { return false; }
    }
  };

  // Promo Code Manager
  window.PromoCode = {
    async validate(code, total) {
      try {
        const res = await fetch('api/promos.php?action=validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code, total: total || 0 })
        });
        const data = await res.json();
        return data;
      } catch (e) { console.error('Promo error:', e); return { error: 'Validation failed' }; }
    },
    async apply(code) {
      try {
        const res = await fetch('api/promos.php?action=apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code })
        });
        const data = await res.json();
        return data;
      } catch (e) { console.error('Promo error:', e); return { error: 'Apply failed' }; }
    }
  };

  // Newsletter Manager
  window.Newsletter = {
    async subscribe(email) {
      try {
        const res = await fetch('api/newsletter.php?action=subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });
        const data = await res.json();
        return data;
      } catch (e) { console.error('Newsletter error:', e); return { error: 'Subscription failed' }; }
    }
  };

  // Cookie Consent
  window.CookieConsent = {
    accepted: false,
    init() {
      try {
        this.accepted = localStorage.getItem('cookie_consent') === 'accepted';
      } catch (e) { this.accepted = false; }
      if (!this.accepted) this.show();
    },
    show() {
      let banner = document.querySelector('.cookie-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.innerHTML = '<p>🍪 This site uses cookies to enhance your experience. <a href="/privacy.html">Learn more</a>.</p><button class="btn btn-sm btn-primary" onclick="CookieConsent.accept()">Accept</button>';
        document.body.appendChild(banner);
      }
      banner.classList.remove('hidden');
    },
    accept() {
      try { localStorage.setItem('cookie_consent', 'accepted'); } catch (e) {}
      const banner = document.querySelector('.cookie-banner');
      if (banner) banner.classList.add('hidden');
    }
  };

  // Discord Widget
  window.DiscordWidget = {
    isOpen: false,
    serverId: '',
    memberCount: 0,
    init(serverId) {
      this.serverId = serverId;
      this.fetchCount();
      this.render();
      this.bindEvents();
    },
    async fetchCount() {
      if (!this.serverId) return;
      try {
        const res = await fetch('https://discord.com/api/guilds/' + this.serverId + '/widget.json');
        const data = await res.json();
        this.memberCount = data.presence_count || 0;
      } catch (e) { console.error('Discord fetch failed:', e); }
    },
    render() {
      let widget = document.querySelector('.discord-widget');
      if (!widget) {
        widget = document.createElement('div');
        widget.className = 'discord-widget';
        widget.innerHTML = '<button class="discord-widget-btn" aria-label="Join Discord">💬</button><div class="discord-widget-panel"><h4>Join Our Discord</h4><p class="member-count">' + this.memberCount + ' members online</p><a href="https://discord.gg/your-server" target="_blank" class="btn btn-sm btn-primary" style="margin-top:12px;width:100%;">Join Server</a></div>';
        document.body.appendChild(widget);
      }
    },
    bindEvents() {
      const btn = document.querySelector('.discord-widget-btn');
      const panel = document.querySelector('.discord-widget-panel');
      if (btn && panel) {
        btn.addEventListener('click', () => {
          this.isOpen = !this.isOpen;
          panel.classList.toggle('open', this.isOpen);
        });
        document.addEventListener('click', (e) => {
          if (!panel.contains(e.target) && !btn.contains(e.target) && this.isOpen) {
            this.isOpen = false;
            panel.classList.remove('open');
          }
        });
      }
    }
  };

  // Chart.js Dark Theme Defaults
  window.ChartDefaults = {
    getConfig() {
      return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { labels: { color: '#a0a0a0', font: { family: 'Inter', size: 12 } } },
          tooltip: {
            backgroundColor: '#1a1a1a',
            titleColor: '#fff',
            bodyColor: '#a0a0a0',
            borderColor: 'rgba(212,175,55,0.3)',
            borderWidth: 1,
            cornerRadius: 8
          }
        },
        scales: {
          x: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      };
    },
    createLineChart(canvasId, labels, datasets) {
      const ctx = document.getElementById(canvasId);
      if (!ctx) return null;
      const config = this.getConfig();
      config.data = { labels: labels, datasets: datasets };
      return new Chart(ctx, config);
    },
    createDonutChart(canvasId, labels, data, colors) {
      const ctx = document.getElementById(canvasId);
      if (!ctx) return null;
      const config = this.getConfig();
      config.data = { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] };
      return new Chart(ctx, config);
    }
  };

})();
