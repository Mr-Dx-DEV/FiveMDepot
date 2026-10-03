/* Admin — Homepage builder, FAQ, Settings, Activity log */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;

  // Field definitions per homepage section. t: text | area | number | pairs (value/label list) | list (strings)
  var SECTIONS = {
    hero: { name: 'Hero banner', fields: [['badge', 'Badge text'], ['headline', 'Headline (last word gets the orange gradient)'], ['subtitle', 'Subtitle', 'area'],
      ['primary_text', 'Main button text'], ['primary_link', 'Main button link'], ['secondary_text', 'Second button text'], ['secondary_link', 'Second button link']] },
    trust: { name: 'Trust numbers', fields: [['items', 'Numbers (value + label)', 'pairs']] },
    categories: { name: 'Shop by category', fields: [['heading', 'Heading'], ['subheading', 'Subheading']] },
    featured: { name: 'Featured products', fields: [['heading', 'Heading'], ['limit', 'How many products', 'number']] },
    server_pack: { name: 'Server pack showcase', fields: [['heading', 'Heading'], ['subheading', 'Subheading'], ['stats', 'Big numbers (value + label)', 'pairs'],
      ['benefits', 'Benefits', 'list'], ['cta_text', 'Button text'], ['cta_link', 'Button link']] },
    new: { name: 'New releases', fields: [['heading', 'Heading'], ['limit', 'How many products', 'number']] },
    free: { name: 'Free assets', fields: [['heading', 'Heading'], ['limit', 'How many products', 'number']] },
    about: { name: 'About', fields: [['heading', 'Heading'], ['body', 'Text', 'area']] },
    faq: { name: 'FAQ', fields: [['heading', 'Heading']], note: 'Questions are edited on the <a class="link" href="#/faqs">FAQ page</a>.' }
  };

  function pairRow(v) {
    v = v || {};
    return '<div class="list-row"><input class="input" data-k="value" placeholder="Value e.g. 4.9/5" value="' + h(v.value || '') + '" style="max-width:160px">' +
      '<input class="input" data-k="label" placeholder="Label e.g. Customer rating" value="' + h(v.label || '') + '"><button type="button" class="icon-btn" data-rm aria-label="Remove">✕</button></div>';
  }
  function listRow(v) {
    return '<div class="list-row"><input class="input" data-k="item" value="' + h(v || '') + '"><button type="button" class="icon-btn" data-rm aria-label="Remove">✕</button></div>';
  }

  function fieldHtml(f, content) {
    var key = f[0], label = f[1], type = f[2] || 'text', v = content[key];
    if (type === 'area') return '<label class="field"><span>' + label + '</span><textarea class="input" rows="3" data-f="' + key + '">' + h(v || '') + '</textarea></label>';
    if (type === 'number') return '<label class="field"><span>' + label + '</span><input class="input" type="number" min="1" max="24" data-f="' + key + '" value="' + h(v || 8) + '" style="max-width:140px"></label>';
    if (type === 'pairs') return '<div class="field"><span>' + label + '</span><div class="list-edit" data-pairs="' + key + '">' + (v || []).map(pairRow).join('') +
      '<button type="button" class="btn btn-sm btn-ghost" data-addpair>+ Add</button></div></div>';
    if (type === 'list') return '<div class="field"><span>' + label + '</span><div class="list-edit" data-list="' + key + '">' + (v || []).map(listRow).join('') +
      '<button type="button" class="btn btn-sm btn-ghost" data-addlist>+ Add</button></div></div>';
    return '<label class="field"><span>' + label + '</span><input class="input" data-f="' + key + '" value="' + h(v || '') + '"></label>';
  }

  A.page('/homepage', function (el) {
    var dirty = false;
    A.guard(function () { return dirty; });
    el.innerHTML = A.head('Homepage', 'Turn sections on or off, drag to reorder, and edit their text. Changes go live when you save.',
      '<a class="btn btn-sm btn-ghost" href="../index.html" target="_blank" rel="noopener">Preview ↗</a><button class="btn btn-sm btn-primary" id="saveHome">Save homepage</button>') +
      '<div id="secs"></div>';
    var box = el.querySelector('#secs');

    function load() {
      return A.get('admin/homepage').then(function (b) {
        var have = b.data.map(function (s) { return s.key; });
        Object.keys(SECTIONS).forEach(function (k) { if (have.indexOf(k) === -1) b.data.push({ key: k, is_enabled: false, content: {} }); });
        box.innerHTML = b.data.filter(function (s) { return SECTIONS[s.key]; }).map(function (s) {
          var def = SECTIONS[s.key];
          return '<div class="hsec' + (s.is_enabled ? '' : ' off') + '" data-key="' + s.key + '" draggable="true">' +
            '<div class="hsec-head"><span class="grip" aria-hidden="true">⋮⋮</span><b>' + def.name + '</b>' +
            '<label class="switch" onclick="event.stopPropagation()"><span class="small muted">' + (s.is_enabled ? 'Shown' : 'Hidden') + '</span><input type="checkbox" data-enabled' + (s.is_enabled ? ' checked' : '') + ' aria-label="Show ' + def.name + '"></label>' +
            '<span class="muted">▾</span></div>' +
            '<div class="hsec-body" hidden>' + def.fields.map(function (f) { return fieldHtml(f, s.content || {}); }).join('') + (def.note ? '<p class="small muted">' + def.note + '</p>' : '') + '</div></div>';
        }).join('');
      });
    }

    function collect() {
      return Array.prototype.map.call(box.querySelectorAll('.hsec'), function (sec) {
        var content = {};
        sec.querySelectorAll('[data-f]').forEach(function (i) { content[i.dataset.f] = i.type === 'number' ? +i.value : i.value; });
        sec.querySelectorAll('[data-pairs]').forEach(function (w) {
          content[w.dataset.pairs] = Array.prototype.map.call(w.querySelectorAll('.list-row'), function (r) {
            return { value: r.querySelector('[data-k=value]').value.trim(), label: r.querySelector('[data-k=label]').value.trim() };
          }).filter(function (p) { return p.value || p.label; });
        });
        sec.querySelectorAll('[data-list]').forEach(function (w) {
          content[w.dataset.list] = Array.prototype.map.call(w.querySelectorAll('[data-k=item]'), function (i) { return i.value.trim(); }).filter(Boolean);
        });
        return { key: sec.dataset.key, is_enabled: sec.querySelector('[data-enabled]').checked, content: content };
      });
    }

    box.addEventListener('click', function (e) {
      if (e.target.closest('[data-addpair]')) { e.target.closest('[data-addpair]').insertAdjacentHTML('beforebegin', pairRow()); dirty = true; return; }
      if (e.target.closest('[data-addlist]')) { e.target.closest('[data-addlist]').insertAdjacentHTML('beforebegin', listRow()); dirty = true; return; }
      if (e.target.closest('[data-rm]')) { e.target.closest('.list-row').remove(); dirty = true; return; }
      var head = e.target.closest('.hsec-head');
      if (head) { var body = head.nextElementSibling; body.hidden = !body.hidden; }
    });
    box.addEventListener('input', function () { dirty = true; });
    box.addEventListener('change', function (e) {
      dirty = true;
      if (e.target.matches('[data-enabled]')) {
        var sec = e.target.closest('.hsec');
        sec.classList.toggle('off', !e.target.checked);
        sec.querySelector('.hsec-head .switch span').textContent = e.target.checked ? 'Shown' : 'Hidden';
      }
    });
    var drag = null;
    box.addEventListener('dragstart', function (e) {
      if (e.target.closest('input, textarea')) { e.preventDefault(); return; }
      drag = e.target.closest('.hsec'); if (drag) drag.classList.add('dragging');
    });
    box.addEventListener('dragover', function (e) {
      var over = e.target.closest('.hsec');
      if (!drag || !over || over === drag) return;
      e.preventDefault();
      var r = over.getBoundingClientRect();
      box.insertBefore(drag, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
    });
    box.addEventListener('dragend', function () { if (drag) drag.classList.remove('dragging'); drag = null; dirty = true; });

    el.querySelector('#saveHome').addEventListener('click', function (e) {
      var btn = e.target; btn.disabled = true;
      A.post('admin/homepage', { sections: collect() }).then(function () { dirty = false; A.toast('Homepage saved — it’s live'); })
        .catch(A.fail).finally(function () { btn.disabled = false; });
    });
    return load();
  });

  // ============================================================
  // FAQ
  // ============================================================
  A.page('/faqs', function (el) {
    var dirty = false;
    A.guard(function () { return dirty; });
    el.innerHTML = A.head('FAQ', 'Questions shown at the bottom of the homepage. Drag to reorder.',
      '<button class="btn btn-sm btn-ghost" id="addQ">+ Question</button><button class="btn btn-sm btn-primary" id="saveQ">Save FAQ</button>') + '<div id="qs"></div>';
    var box = el.querySelector('#qs');
    function item(f) {
      f = f || { question: '', answer: '', is_active: 1 };
      return '<div class="hsec" draggable="true"><div class="hsec-body" style="border:0;padding-top:14px">' +
        '<div style="display:flex;gap:8px;align-items:center"><span class="grip muted" style="cursor:grab">⋮⋮</span><input class="input" data-q placeholder="Question" maxlength="500" value="' + h(f.question) + '">' +
        '<label class="switch" style="gap:6px"><span class="small muted">Shown</span><input type="checkbox" data-on' + (+f.is_active ? ' checked' : '') + '></label><button type="button" class="icon-btn" data-rm aria-label="Remove">✕</button></div>' +
        '<textarea class="input" data-a rows="2" placeholder="Answer" maxlength="5000">' + h(f.answer) + '</textarea></div></div>';
    }
    el.querySelector('#addQ').addEventListener('click', function () { box.insertAdjacentHTML('beforeend', item()); box.lastElementChild.querySelector('[data-q]').focus(); dirty = true; });
    box.addEventListener('click', function (e) { if (e.target.closest('[data-rm]')) { e.target.closest('.hsec').remove(); dirty = true; } });
    box.addEventListener('input', function () { dirty = true; });
    var drag = null;
    box.addEventListener('dragstart', function (e) { if (e.target.closest('input, textarea')) { e.preventDefault(); return; } drag = e.target.closest('.hsec'); });
    box.addEventListener('dragover', function (e) {
      var over = e.target.closest('.hsec');
      if (!drag || !over || over === drag) return;
      e.preventDefault();
      var r = over.getBoundingClientRect();
      box.insertBefore(drag, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
    });
    box.addEventListener('dragend', function () { drag = null; dirty = true; });
    el.querySelector('#saveQ').addEventListener('click', function () {
      var items = Array.prototype.map.call(box.querySelectorAll('.hsec'), function (s) {
        return { question: s.querySelector('[data-q]').value, answer: s.querySelector('[data-a]').value, is_active: s.querySelector('[data-on]').checked };
      });
      A.post('admin/faqs', { items: items }).then(function (b) { dirty = false; A.toast(b.data.saved + ' questions saved'); }).catch(A.fail);
    });
    return A.get('admin/faqs').then(function (b) { box.innerHTML = b.data.map(item).join('') || ''; if (!b.data.length) el.querySelector('#addQ').click(); dirty = false; });
  });

  // ============================================================
  // Settings
  // ============================================================
  var GROUPS = [
    ['Store', [['site_name', 'Store name'], ['site_tagline', 'Tagline'], ['since_year', 'Founded year (footer badge)'], ['currency_symbol', 'Currency symbol']]],
    ['Announcement bar', [['topbar_text', 'Text (leave empty to hide)'], ['topbar_link', 'Link']]],
    ['Social links', [['social_discord', 'Discord invite (https://…)'], ['social_github', 'GitHub (https://…)'], ['social_youtube', 'YouTube (https://…)'], ['discord_widget_server_id', 'Discord widget server ID']]],
    ['Payments', [['bkash_number', 'bKash number'], ['nagad_number', 'Nagad number'], ['bank_name', 'Bank name'], ['bank_account', 'Bank account'], ['bank_branch', 'Bank branch'], ['download_expiry_days', 'Download link valid for (days)']]],
    ['Features', [['seller_auto_approve', 'Auto-approve new sellers', 'bool'], ['newsletter_enabled', 'Newsletter signup', 'bool'], ['free_assets_enabled', 'Free assets section', 'bool'], ['cookie_consent_text', 'Cookie banner text', 'area']]]
  ];
  A.page('/settings', function (el) {
    var dirty = false;
    A.guard(function () { return dirty; });
    el.innerHTML = A.head('Settings', 'Store information, payments and features.', '<button class="btn btn-sm btn-primary" form="sform">Save settings</button>') + '<form id="sform" class="stack" novalidate></form>';
    var form = el.querySelector('#sform');
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = A.formData(form);
      Object.keys(d).forEach(function (k) { if (typeof d[k] === 'boolean') d[k] = d[k] ? '1' : '0'; });
      A.post('admin/settings', d).then(function () { dirty = false; A.toast('Settings saved'); }).catch(function (err) { A.fail(err); A.fieldErrors(form, err); });
    });
    return A.get('admin/settings').then(function (b) {
      var s = b.data;
      form.innerHTML = GROUPS.map(function (g) {
        return '<div class="panel"><div class="panel-head"><h3>' + g[0] + '</h3></div><div class="panel-pad form-grid">' + g[1].map(function (f) {
          if (f[2] === 'bool') return '<label class="switch"><span>' + f[1] + '</span><input type="checkbox" name="' + f[0] + '"' + (s[f[0]] === '1' ? ' checked' : '') + '></label>';
          if (f[2] === 'area') return '<label class="field"><span>' + f[1] + '</span><textarea class="input" name="' + f[0] + '" rows="2">' + h(s[f[0]]) + '</textarea></label>';
          return '<label class="field"><span>' + f[1] + '</span><input class="input" name="' + f[0] + '" value="' + h(s[f[0]]) + '"></label>';
        }).join('') + '</div></div>';
      }).join('');
    });
  });

  // ============================================================
  // Activity log
  // ============================================================
  A.page('/activity', function (el) {
    var page = 1, q = '';
    el.innerHTML = A.head('Activity log', 'Every admin action and login, newest first.') +
      '<div class="panel"><div class="tools"><input class="input grow" id="aq" type="search" placeholder="Filter by action, user or details…"></div><div id="box"></div><div id="pager"></div></div>';
    function load() {
      return A.get('admin/activity&page=' + page + (q ? '&q=' + encodeURIComponent(q) : '')).then(function (b) {
        el.querySelector('#box').innerHTML = b.data.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th><th>IP</th></tr></thead><tbody>' +
          b.data.map(function (a) {
            return '<tr><td class="small muted" title="' + h(a.created_at) + '">' + A.ago(a.created_at) + '</td><td>' + h(a.user_name || 'system') + '</td>' +
              '<td><span class="st st-muted">' + h(a.action.replace(/_/g, ' ')) + '</span></td><td class="small">' + h(a.details || '') + (a.entity_type ? ' <span class="muted">' + h(a.entity_type) + '</span>' : '') + '</td><td class="mono muted">' + h(a.ip_address || '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : A.empty('No activity', '');
        var pg = el.querySelector('#pager'); pg.innerHTML = '';
        pg.appendChild(A.pager(b.meta, function (n) { page = n; load(); }));
      }).catch(A.fail);
    }
    var deb;
    el.querySelector('#aq').addEventListener('input', function (e) { clearTimeout(deb); deb = setTimeout(function () { q = e.target.value.trim(); page = 1; load(); }, 300); });
    return load();
  });
})();
