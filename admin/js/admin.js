/**
 * FiveMDepot — Advanced Admin Panel JavaScript
 */

(function() {
  // Check auth
  const sessionUser = window.FiveMDepotSession?.user;
  if (!sessionUser || sessionUser.role !== 'ADMIN') {
    fetch('../api/auth.php?action=status')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated || data.user?.role !== 'ADMIN') {
          window.location.href = '../auth.html?redirect=' + encodeURIComponent(window.location.pathname);
        } else {
          initAdmin(data.user);
        }
      })
      .catch(() => {
        window.location.href = '../auth.html?redirect=' + encodeURIComponent(window.location.pathname);
      });
    return;
  }
  initAdmin(sessionUser);
})();

function initAdmin(user) {
  // Update sidebar
  document.getElementById('adminName').textContent = user.name;
  document.getElementById('adminAvatar').textContent = user.name.charAt(0).toUpperCase();

  // Set current date
  const now = new Date();
  document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Load dashboard
  loadDashboardStats();
  loadPendingItems();
  loadRecentOrders();
  loadRevenueChart();
  loadCategoryPie();

  // Page navigation
  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.dataset.page;
      navigateToPage(page);

      // Load page data
      switch(page) {
        case 'dashboard': loadDashboardStats(); loadPendingItems(); loadRecentOrders(); loadRevenueChart(); loadCategoryPie(); break;
        case 'products': loadProducts(); break;
        case 'categories': loadCategories(); break;
        case 'orders': loadOrders(); break;
        case 'sellers': loadSellers(); break;
        case 'users': loadUsers(); break;
        case 'withdrawals': loadWithdrawals(); break;
        case 'analytics': loadAnalytics(); break;
        case 'settings': loadSettings(); break;
      }
    });
  });

  // Page links
  document.querySelectorAll('.pending-link, .section-link, .card-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navigateToPage(this.dataset.page);
    });
  });

  // Mobile toggle
  document.getElementById('topbarToggle')?.addEventListener('click', function() {
    document.getElementById('adminSidebar').classList.toggle('open');
  });

  // Add product button
  document.getElementById('addProductBtn')?.addEventListener('click', openAddProductModal);

  // Add category button
  document.getElementById('addCategoryBtn')?.addEventListener('click', openAddCategoryModal);

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      this.parentElement.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      const filter = this.dataset.filter;
      const page = this.closest('.admin-page').id.replace('page-', '');

      switch(page) {
        case 'products': loadProducts(filter); break;
        case 'orders': loadOrders(filter); break;
        case 'sellers': loadSellers(filter); break;
        case 'users': loadUsers(filter); break;
        case 'withdrawals': loadWithdrawals(filter); break;
      }
    });
  });

  // Product search
  document.getElementById('productSearch')?.addEventListener('input', debounce(function() {
    loadProducts('all', this.value);
  }, 300));

  // Save settings
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveAllSettings);
}

function navigateToPage(page) {
  // Update sidebar
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.sidebar-link[data-page="${page}"]`)?.classList.add('active');

  // Show page
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');

  // Close mobile sidebar
  document.getElementById('adminSidebar')?.classList.remove('open');
}

// ============================================
// Dashboard
// ============================================

function loadDashboardStats() {
  fetch('../api/admin.php?action=stats')
    .then(res => res.json())
    .then(data => {
      const s = data.stats || {};
      animateValue('dashUsers', s.total_users || 0);
      animateValue('dashSellers', s.total_sellers || 0);
      animateValue('dashProducts', s.total_products || 0);
      document.getElementById('dashRevenue').textContent = '$' + (s.total_revenue || 0).toLocaleString();
    })
    .catch(err => console.error('Failed to load stats:', err));
}

function loadPendingItems() {
  // Pending sellers
  fetch('../api/admin.php?action=sellers&status=PENDING')
    .then(res => res.json())
    .then(data => {
      const sellers = data.sellers || [];
      document.getElementById('sellersPendingBadge').textContent = sellers.length;
      const container = document.getElementById('pendingSellers');
      if (sellers.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No pending seller applications.</p>';
      } else {
        container.innerHTML = sellers.slice(0, 5).map(s => `
          <div class="pending-item">
            <div class="pending-item-info">
              <div class="pending-item-name">${s.name}</div>
              <div class="pending-item-email">${s.email}</div>
            </div>
            <div class="pending-item-actions">
              <button class="btn btn-sm btn-success" onclick="window.approveSeller('${s.id}')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="window.rejectSeller('${s.id}')">Reject</button>
            </div>
          </div>
        `).join('');
      }
    })
    .catch(err => console.error('Failed to load sellers:', err));

  // Pending orders
  fetch('../api/admin.php?action=orders&status=PENDING')
    .then(res => res.json())
    .then(data => {
      const orders = data.orders || [];
      document.getElementById('ordersPendingBadge').textContent = orders.length;
      const container = document.getElementById('pendingOrders');
      if (orders.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No pending orders.</p>';
      } else {
        container.innerHTML = orders.slice(0, 5).map(o => `
          <div class="pending-item">
            <div class="pending-item-info">
              <div class="pending-item-name">#${o.id.substring(0, 8)}</div>
              <div class="pending-item-email">${o.buyer_name || '—'} — $${parseFloat(o.total_amount).toFixed(2)}</div>
            </div>
            <div class="pending-item-actions">
              <button class="btn btn-sm btn-success" onclick="window.verifyOrder('${o.id}', 'approve')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="window.verifyOrder('${o.id}', 'reject')">Reject</button>
            </div>
          </div>
        `).join('');
      }
    })
    .catch(err => console.error('Failed to load orders:', err));

  // Pending products
  fetch('../api/admin.php?action=products&status=PENDING')
    .then(res => res.json())
    .then(data => {
      const products = data.products || [];
      document.getElementById('productsPendingBadge').textContent = products.length;
      const container = document.getElementById('pendingProducts');
      if (products.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No pending products.</p>';
      } else {
        container.innerHTML = products.slice(0, 5).map(p => `
          <div class="pending-item">
            <div class="pending-item-info">
              <div class="pending-item-name">${p.title}</div>
              <div class="pending-item-email">${p.seller_name || '—'}</div>
            </div>
            <div class="pending-item-actions">
              <button class="btn btn-sm btn-success" onclick="window.approveProduct('${p.id}')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="window.rejectProduct('${p.id}')">Reject</button>
            </div>
          </div>
        `).join('');
      }
    })
    .catch(err => console.error('Failed to load products:', err));

  // Update notification dot
  const totalPending = (data?.sellers?.length || 0) + (data?.orders?.length || 0);
  document.getElementById('notifDot').style.display = totalPending > 0 ? 'block' : 'none';
}

function loadRecentOrders() {
  fetch('../api/admin.php?action=stats')
    .then(res => res.json())
    .then(data => {
      const orders = data.stats?.recent_orders || [];
      const container = document.getElementById('recentOrders');
      if (orders.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No orders yet.</p>';
      } else {
        container.innerHTML = orders.map(o => `
          <div class="pending-item">
            <div class="pending-item-info">
              <div class="pending-item-name">#${o.id.substring(0, 8)}</div>
              <div class="pending-item-email">${o.buyer_name || '—'}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="font-weight: 600; color: var(--admin-gold);">$${parseFloat(o.total_amount).toFixed(2)}</div>
              <span class="badge badge-${o.status === 'VERIFIED' ? 'success' : o.status === 'PENDING' ? 'warning' : 'danger'}">${o.status}</span>
            </div>
          </div>
        `).join('');
      }
    })
    .catch(err => console.error('Failed to load recent orders:', err));
}

function loadRevenueChart() {
  fetch('../api/admin.php?action=analytics')
    .then(res => res.json())
    .then(data => {
      const revenueData = data.analytics?.revenue_chart || [];
      const container = document.getElementById('revenueChart');

      if (revenueData.length === 0) {
        container.innerHTML = '<p class="chart-placeholder">No revenue data yet.</p>';
        return;
      }

      const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);

      container.innerHTML = '<div class="revenue-bars">' + revenueData.map(d => {
        const height = Math.max((d.revenue / maxRevenue) * 160, 4);
        const date = new Date(d.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `
          <div class="revenue-bar-col">
            <div class="revenue-bar" style="height: ${height}px;" title="$${d.revenue.toFixed(2)}"></div>
            <div class="revenue-bar-label">${label}</div>
          </div>
        `;
      }).join('') + '</div>';
    })
    .catch(err => console.error('Failed to load revenue chart:', err));
}

function loadCategoryPie() {
  fetch('../api/admin.php?action=analytics')
    .then(res => res.json())
    .then(data => {
      const categories = data.analytics?.category_sales || [];
      const container = document.getElementById('categoryPie');
      const colors = ['#d4af37', '#00f0ff', '#ff00aa', '#3b82f6', '#22c55e', '#fbbf24'];

      if (categories.length === 0) {
        container.innerHTML = '<p class="chart-placeholder">No data yet.</p>';
        return;
      }

      const maxRevenue = Math.max(...categories.map(c => c.revenue), 1);

      container.innerHTML = '<div class="category-pie-list">' + categories.map((c, i) => `
        <div class="category-pie-item">
          <div class="category-pie-color" style="background: ${colors[i % colors.length]}"></div>
          <div class="category-pie-info">
            <div class="category-pie-name">${c.category}</div>
            <div class="category-pie-value">$${c.revenue.toFixed(2)} (${c.sales} sales)</div>
            <div class="category-pie-bar">
              <div class="category-pie-bar-fill" style="width: ${(c.revenue / maxRevenue) * 100}%; background: ${colors[i % colors.length]}"></div>
            </div>
          </div>
        </div>
      `).join('') + '</div>';
    })
    .catch(err => console.error('Failed to load category pie:', err));
}

// ============================================
// Products
// ============================================

function loadProducts(filter = 'all', search = '') {
  let url = '../api/admin.php?action=products';
  if (filter !== 'all') url += '&status=' + filter;
  if (search) url += '&search=' + encodeURIComponent(search);

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const products = data.products || [];
      const container = document.getElementById('productsGrid');

      if (products.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No products found.</p>';
        return;
      }

      container.innerHTML = products.map(p => `
        <div class="product-card-admin">
          <div class="product-card-image">
            <span>No image</span>
            <div class="product-card-status">
              <span class="badge badge-${p.status === 'PUBLISHED' ? 'success' : p.status === 'PENDING' ? 'warning' : 'danger'}">${p.status}</span>
            </div>
          </div>
          <div class="product-card-body">
            <h4 class="product-card-title">${p.title}</h4>
            <div class="product-card-meta">
              <span class="product-card-price">$${parseFloat(p.price).toFixed(2)}</span>
              <span class="product-card-category">${p.category}</span>
            </div>
            <div class="product-card-footer">
              <span class="product-card-seller">${p.seller_name || '—'}</span>
              <div class="product-card-actions">
                <span style="font-size: 0.75rem; color: var(--admin-text-muted);">${p.downloads || 0} ↓</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load products:', err));
}

// ============================================
// Categories
// ============================================

function loadCategories() {
  fetch('../api/admin.php?action=categories')
    .then(res => res.json())
    .then(data => {
      const categories = data.categories || [];
      const container = document.getElementById('categoriesGrid');

      if (categories.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No categories yet.</p>';
        return;
      }

      container.innerHTML = categories.map(c => `
        <div class="category-card">
          <div class="category-card-icon">${c.icon || '&#128193;'}</div>
          <div class="category-card-info">
            <h4 class="category-card-name">${c.name}</h4>
            <div class="category-card-count">${c.product_count || 0} products</div>
          </div>
          <div class="category-card-actions">
            <button class="btn btn-sm" onclick="window.editCategory('${c.id}', '${c.name}', '${c.icon || ''}', '${c.description || ''}', ${c.order || 0}, ${c.is_active ? 1 : 0})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteCategory('${c.id}')">Delete</button>
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load categories:', err));
}

// ============================================
// Orders
// ============================================

function loadOrders(filter = 'all') {
  let url = '../api/admin.php?action=orders';
  if (filter !== 'all') url += '&status=' + filter;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const orders = data.orders || [];
      const container = document.getElementById('ordersList');

      if (orders.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No orders found.</p>';
        return;
      }

      container.innerHTML = orders.map(o => `
        <div class="order-item">
          <div class="order-item-left">
            <div class="order-item-id">#${o.id.substring(0, 8)}</div>
            <div class="order-item-email">${o.buyer_name || '—'}</div>
          </div>
          <div class="order-item-right">
            <span style="font-weight: 600; color: var(--admin-gold);">$${parseFloat(o.total_amount).toFixed(2)}</span>
            <span class="badge badge-${o.status === 'VERIFIED' ? 'success' : o.status === 'PENDING' ? 'warning' : 'danger'}">${o.status}</span>
            ${o.status === 'PENDING' ? `
              <button class="btn btn-sm btn-success" onclick="window.verifyOrder('${o.id}', 'approve')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="window.verifyOrder('${o.id}', 'reject')">Reject</button>
            ` : ''}
            ${o.download_code ? `<span style="font-family: monospace; font-size: 0.6875rem; color: var(--admin-cyan);">${o.download_code}</span>` : ''}
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load orders:', err));
}

// ============================================
// Sellers
// ============================================

function loadSellers(filter = 'all') {
  let url = '../api/admin.php?action=sellers';
  if (filter !== 'all') url += '&status=' + filter;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const sellers = data.sellers || [];
      const container = document.getElementById('sellersList');

      if (sellers.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No sellers found.</p>';
        return;
      }

      container.innerHTML = sellers.map(s => `
        <div class="seller-item">
          <div class="seller-item-left">
            <div class="seller-item-name">${s.name}</div>
            <div class="seller-item-email">${s.email}</div>
          </div>
          <div class="seller-item-right">
            <span>${s.discord_tag || '—'}</span>
            <span class="badge badge-${s.status === 'APPROVED' ? 'success' : s.status === 'PENDING' ? 'warning' : 'danger'}">${s.status}</span>
            ${s.status === 'PENDING' ? `
              <button class="btn btn-sm btn-success" onclick="window.approveSeller('${s.id}')">Approve</button>
              <button class="btn btn-sm btn-danger" onclick="window.rejectSeller('${s.id}')">Reject</button>
            ` : ''}
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load sellers:', err));
}

// ============================================
// Users
// ============================================

function loadUsers(filter = 'all') {
  let url = '../api/admin.php?action=users';
  if (filter !== 'all') url += '&role=' + filter;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const users = data.users || [];
      const container = document.getElementById('usersList');

      if (users.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No users found.</p>';
        return;
      }

      container.innerHTML = users.map(u => `
        <div class="user-item">
          <div class="user-item-left">
            <div class="user-item-name">${u.name}</div>
            <div class="user-item-email">${u.email}</div>
          </div>
          <div class="user-item-right">
            <span style="font-weight: 600;">$${parseFloat(u.wallet_balance || 0).toFixed(2)}</span>
            <span class="badge badge-${u.role === 'ADMIN' ? 'danger' : u.role === 'SELLER' ? 'warning' : 'success'}">${u.role}</span>
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load users:', err));
}

// ============================================
// Withdrawals
// ============================================

function loadWithdrawals(filter = 'all') {
  let url = '../api/admin.php?action=withdrawals';
  if (filter !== 'all') url += '&status=' + filter;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const withdrawals = data.withdrawals || [];
      const container = document.getElementById('withdrawalsList');

      if (withdrawals.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No withdrawal requests.</p>';
        return;
      }

      container.innerHTML = withdrawals.map(w => `
        <div class="withdrawal-item">
          <div class="withdrawal-item-left">
            <div class="withdrawal-item-name">${w.name || '—'}</div>
            <div class="withdrawal-item-email">${w.account_info || '—'}</div>
          </div>
          <div class="withdrawal-item-right">
            <span style="font-weight: 600; color: var(--admin-gold);">$${parseFloat(w.amount).toFixed(2)}</span>
            <span>${w.method}</span>
            <span class="badge badge-${w.status === 'PAID' ? 'success' : w.status === 'PENDING' ? 'warning' : 'danger'}">${w.status}</span>
            ${w.status === 'PENDING' ? `
              <button class="btn btn-sm btn-success" onclick="window.approveWithdrawal('${w.id}', 'approve')">Pay</button>
              <button class="btn btn-sm btn-danger" onclick="window.approveWithdrawal('${w.id}', 'reject')">Reject</button>
            ` : ''}
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load withdrawals:', err));
}

// ============================================
// Analytics
// ============================================

function loadAnalytics() {
  fetch('../api/admin.php?action=analytics')
    .then(res => res.json())
    .then(data => {
      const a = data.analytics || {};
      const p = a.platform || {};

      const container = document.getElementById('analyticsOverview');
      container.innerHTML = `
        <div class="analytics-stat">
          <div class="analytics-stat-value">${p.total_users || 0}</div>
          <div class="analytics-stat-label">Total Users</div>
        </div>
        <div class="analytics-stat">
          <div class="analytics-stat-value">${p.total_sellers || 0}</div>
          <div class="analytics-stat-label">Total Sellers</div>
        </div>
        <div class="analytics-stat">
          <div class="analytics-stat-value">${p.total_products || 0}</div>
          <div class="analytics-stat-label">Total Products</div>
        </div>
        <div class="analytics-stat">
          <div class="analytics-stat-value">$${(p.total_revenue || 0).toLocaleString()}</div>
          <div class="analytics-stat-label">Total Revenue</div>
        </div>
      `;

      // Revenue chart
      const revenueData = a.revenue_chart || [];
      const chartContainer = document.getElementById('analyticsRevenueChart');
      if (revenueData.length > 0) {
        const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);
        chartContainer.innerHTML = '<div class="revenue-bars">' + revenueData.map(d => {
          const height = Math.max((d.revenue / maxRevenue) * 200, 4);
          const date = new Date(d.date);
          const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `
            <div class="revenue-bar-col">
              <div class="revenue-bar" style="height: ${height}px;" title="$${d.revenue.toFixed(2)}"></div>
              <div class="revenue-bar-label">${label}</div>
            </div>
          `;
        }).join('') + '</div>';
      } else {
        chartContainer.innerHTML = '<p class="chart-placeholder">No revenue data yet.</p>';
      }

      // Top products
      const topProducts = a.top_products || [];
      const topContainer = document.getElementById('topProductsList');
      if (topProducts.length === 0) {
        topContainer.innerHTML = '<p class="chart-placeholder">No sales data yet.</p>';
      } else {
        topContainer.innerHTML = '<div class="top-products-list">' + topProducts.map((p, i) => `
          <div class="top-product-item">
            <div class="top-product-rank">${i + 1}</div>
            <div class="top-product-info">
              <div class="top-product-name">${p.title}</div>
              <div class="top-product-stats">${p.times_sold} sales in ${p.category}</div>
            </div>
            <div class="top-product-revenue">$${p.revenue.toFixed(2)}</div>
          </div>
        `).join('') + '</div>';
      }

      // Seller earnings
      const sellerEarnings = a.seller_earnings || [];
      const earningsContainer = document.getElementById('sellerEarningsList');
      if (sellerEarnings.length === 0) {
        earningsContainer.innerHTML = '<p class="chart-placeholder">No earnings data yet.</p>';
      } else {
        earningsContainer.innerHTML = '<div class="seller-earnings-list">' + sellerEarnings.map(s => `
          <div class="top-product-item">
            <div class="top-product-info">
              <div class="top-product-name">${s.name}</div>
              <div class="top-product-stats">${s.email}</div>
            </div>
            <div class="top-product-revenue">$${s.earnings.toFixed(2)}</div>
          </div>
        `).join('') + '</div>';
      }
    })
    .catch(err => console.error('Failed to load analytics:', err));
}

// ============================================
// Settings
// ============================================

function loadSettings() {
  fetch('../api/admin.php?action=settings')
    .then(res => res.json())
    .then(data => {
      const settings = data.settings || {};
      document.querySelectorAll('#generalSettingsForm .form-input').forEach(input => {
        const key = input.dataset.key;
        if (settings[key]) input.value = settings[key].value || '';
      });
      document.querySelectorAll('#paymentSettingsForm .form-input').forEach(input => {
        const key = input.dataset.key;
        if (settings[key]) input.value = settings[key].value || '';
      });
      document.querySelectorAll('#sellerSettingsForm .form-checkbox').forEach(input => {
        const key = input.dataset.key;
        if (settings[key]) input.checked = settings[key].value === '1';
      });
    })
    .catch(err => console.error('Failed to load settings:', err));
}

function saveAllSettings() {
  const settings = {};
  document.querySelectorAll('.settings-form .form-input, .settings-form .form-checkbox').forEach(input => {
    const key = input.dataset.key;
    if (key) {
      settings[key] = input.type === 'checkbox' ? (input.checked ? '1' : '0') : input.value;
    }
  });

  fetch('../api/admin.php?action=settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Settings saved successfully!', 'success');
    } else {
      showNotification('Error: ' + (data.error || 'Failed to save'), 'error');
    }
  })
  .catch(err => showNotification('Error: ' + err.message, 'error'));
}

// ============================================
// Modals
// ============================================

function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML || '';
  document.getElementById('adminModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('adminModal').style.display = 'none';
}

document.getElementById('modalClose')?.addEventListener('click', closeModal);
document.getElementById('modalBackdrop')?.addEventListener('click', closeModal);

function openAddCategoryModal() {
  const body = `
    <form id="categoryForm">
      <div class="form-group">
        <label class="form-label">Category Name</label>
        <input type="text" class="form-input" id="catName" required>
      </div>
      <div class="form-group">
        <label class="form-label">Slug</label>
        <input type="text" class="form-input" id="catSlug" required placeholder="e.g., essential-ftpd">
      </div>
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input type="text" class="form-input" id="catIcon" value="&#128193;" placeholder="&#128193;">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="catDescription" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Order</label>
        <input type="number" class="form-input" id="catOrder" value="0">
      </div>
    </form>
  `;
  const footer = `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="window.saveCategory()">Save Category</button>
  `;
  openModal('Add Category', body, footer);
}

function saveCategory() {
  const name = document.getElementById('catName').value;
  const slug = document.getElementById('catSlug').value;
  const icon = document.getElementById('catIcon').value;
  const description = document.getElementById('catDescription').value;
  const order = document.getElementById('catOrder').value;

  if (!name || !slug) {
    showNotification('Name and slug are required', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('action', 'create');
  formData.append('name', name);
  formData.append('slug', slug);
  formData.append('icon', icon);
  formData.append('description', description);
  formData.append('order', order);

  fetch('../api/admin.php?action=categories', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      closeModal();
      loadCategories();
      showNotification('Category created!', 'success');
    } else {
      showNotification('Error: ' + (data.error || 'Failed'), 'error');
    }
  })
  .catch(err => showNotification('Error: ' + err.message, 'error'));
}

// ============================================
// Global Actions
// ============================================

window.approveSeller = function(id) {
  fetch('../api/admin.php?action=approve-seller', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Seller approved!', 'success');
      loadPendingItems();
      loadDashboardStats();
    } else {
      showNotification('Error: ' + (data.error || 'Failed'), 'error');
    }
  });
};

window.rejectSeller = function(id) {
  if (!confirm('Reject this seller application?')) return;
  fetch('../api/admin.php?action=reject-seller', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Seller rejected.', 'success');
      loadPendingItems();
    }
  });
};

window.verifyOrder = function(orderId, action) {
  if (action === 'reject' && !confirm('Reject this order?')) return;
  fetch('../api/orders.php?action=verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, action })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification(data.message || 'Order updated!', 'success');
      loadPendingItems();
      loadRecentOrders();
    }
  });
};

window.approveProduct = function(id) {
  fetch('../api/products.php?action=approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Product approved!', 'success');
      loadPendingItems();
      loadProducts();
    }
  });
};

window.rejectProduct = function(id) {
  if (!confirm('Reject this product?')) return;
  fetch('../api/products.php?action=reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, reason: 'Rejected by admin' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Product rejected.', 'success');
      loadPendingItems();
      loadProducts();
    }
  });
};

window.approveWithdrawal = function(id, action) {
  const confirmMsg = action === 'approve' ? 'Mark this withdrawal as paid?' : 'Reject this withdrawal?';
  if (!confirm(confirmMsg)) return;

  fetch('../api/admin.php?action=approve-withdrawal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Withdrawal updated!', 'success');
      loadWithdrawals();
    }
  });
};

window.editCategory = function(id, name, icon, description, order, isActive) {
  const body = `
    <form id="categoryForm">
      <input type="hidden" id="catId" value="${id}">
      <div class="form-group">
        <label class="form-label">Category Name</label>
        <input type="text" class="form-input" id="catName" value="${name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input type="text" class="form-input" id="catIcon" value="${icon || '&#128193;'}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input" id="catDescription" rows="3">${description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Order</label>
        <input type="number" class="form-input" id="catOrder" value="${order}">
      </div>
      <div class="form-group form-group-checkbox">
        <label class="form-label">
          <input type="checkbox" class="form-checkbox" id="catActive" ${isActive ? 'checked' : ''}>
          Active
        </label>
      </div>
    </form>
  `;
  const footer = `
    <button class="btn" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="window.updateCategory()">Update</button>
  `;
  openModal('Edit Category', body, footer);
};

window.updateCategory = function() {
  const id = document.getElementById('catId').value;
  const name = document.getElementById('catName').value;
  const icon = document.getElementById('catIcon').value;
  const description = document.getElementById('catDescription').value;
  const order = document.getElementById('catOrder').value;
  const isActive = document.getElementById('catActive').checked;

  const formData = new FormData();
  formData.append('action', 'update');
  formData.append('id', id);
  formData.append('name', name);
  formData.append('icon', icon);
  formData.append('description', description);
  formData.append('order', order);
  formData.append('is_active', isActive ? '1' : '0');

  fetch('../api/admin.php?action=categories', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      closeModal();
      loadCategories();
      showNotification('Category updated!', 'success');
    }
  });
};

window.deleteCategory = function(id) {
  if (!confirm('Delete this category? This cannot be undone if it has products.')) return;

  const formData = new FormData();
  formData.append('action', 'delete');
  formData.append('id', id);

  fetch('../api/admin.php?action=categories', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showNotification('Category deleted!', 'success');
      loadCategories();
    } else {
      showNotification('Error: ' + (data.error || 'Failed'), 'error');
    }
  });
};

// ============================================
// Helpers
// ============================================

function animateValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const duration = 1000;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    el.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function showNotification(message, type = 'success') {
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#3b82f6'
  };

  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 14px 20px;
    background: ${colors[type] || colors.success};
    color: white;
    border-radius: 10px;
    font-weight: 500;
    font-size: 0.875rem;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  `;
  notif.textContent = message;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

})();
