/* Admin — Products list, product editor, review queue */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;
  var FRAMEWORKS = ['QBCore', 'ESX', 'QBox', 'Standalone', 'vRP'];

  function tagChips(tags) {
    return '<div class="tchips">' + (tags || []).map(function (t) {
      return '<span class="tchip"><i style="background:' + h(t.color || 'var(--accent)') + '"></i>' + h(t.name) + '</span>';
    }).join('') + '</div>';
  }
  function stripHtml(s) { var d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent || ''; }

  // ============================================================
  // Products list
  // ============================================================
  A.page('/products', function (el) {
    var q = A.query();
    var state = {
      q: q.get('q') || '', status: q.get('status') || '', type: q.get('type') || '', category: q.get('category') || '',
      tag: q.get('tag') || '', sort: q.get('sort') || 'newest', page: +q.get('page') || 1, untagged: q.get('untagged') || ''
    };
    var selected = {};
    var rows = [];

    el.innerHTML = A.head('Products', 'Everything in your store. Tags decide which categories a product shows in.',
      '<a class="btn btn-sm btn-ghost" href="#/review">Review queue</a><a class="btn btn-sm btn-primary" href="#/products/new">+ Add product</a>') +
      '<div class="panel">' +
        '<div class="tabs" id="tabs"></div>' +
        '<div class="tools">' +
          '<input class="input grow" id="f-q" type="search" placeholder="Search title, slug or seller…" value="' + h(state.q) + '">' +
          '<select class="input" id="f-type"><option value="">All types</option><option value="standard">Standard</option><option value="server_pack">Server pack</option></select>' +
          '<select class="input" id="f-cat"><option value="">All categories</option></select>' +
          '<select class="input" id="f-tag"><option value="">All tags</option></select>' +
          '<select class="input" id="f-sort"><option value="newest">Newest</option><option value="updated">Recently updated</option><option value="sales">Best selling</option><option value="title">Title A–Z</option><option value="price-high">Price high–low</option><option value="price-low">Price low–high</option></select>' +
        '</div>' +
        '<div id="bulk"></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
          '<th style="width:36px"><input type="checkbox" id="all" aria-label="Select all"></th><th>Product</th><th>Categories</th><th>Tags</th><th class="num">Price</th><th>Status</th><th class="num">Sales</th><th>Updated</th>' +
        '</tr></thead><tbody id="rows"></tbody></table></div>' +
        '<div id="pager"></div>' +
      '</div>';

    var $ = function (s) { return el.querySelector(s); };
    $('#f-type').value = state.type;
    $('#f-sort').value = state.sort;

    Promise.all([A.ref.get('categories'), A.ref.get('tags')]).then(function (r) {
      $('#f-cat').innerHTML += A.categoryOptions(r[0]).map(function (c) {
        return '<option value="' + h(c.id) + '">' + '  '.repeat(c.depth) + h(c.path.split(' › ').pop()) + '</option>';
      }).join('');
      $('#f-tag').innerHTML += r[1].map(function (t) { return '<option value="' + h(t.id) + '">' + h(t.name) + ' (' + t.product_count + ')</option>'; }).join('');
      $('#f-cat').value = state.category;
      $('#f-tag').value = state.tag;
    }).catch(A.fail);

    function load() {
      A.setQuery({ q: state.q, status: state.status, type: state.type, category: state.category, tag: state.tag, sort: state.sort !== 'newest' ? state.sort : '', page: state.page > 1 ? state.page : '', untagged: state.untagged });
      $('#rows').innerHTML = '<tr><td colspan="8"><div class="adm-loading"><span class="spin"></span>Loading…</div></td></tr>';
      var qs = '&page=' + state.page + '&per_page=25&sort=' + state.sort;
      ['q', 'status', 'type', 'category', 'tag', 'untagged'].forEach(function (k) { if (state[k]) qs += '&' + k + '=' + encodeURIComponent(state[k]); });
      return A.get('admin/products' + qs).then(function (b) {
        rows = b.data;
        var sc = b.meta.status_counts || {}, all = Object.keys(sc).reduce(function (s, k) { return s + sc[k]; }, 0);
        $('#tabs').innerHTML = [['', 'All', all], ['PUBLISHED', 'Published'], ['PENDING', 'Pending'], ['DRAFT', 'Draft'], ['REJECTED', 'Rejected']].map(function (t) {
          var n = t[2] != null ? t[2] : (sc[t[0]] || 0);
          return '<button class="tab' + (state.status.toUpperCase() === t[0] ? ' on' : '') + '" data-status="' + t[0] + '">' + t[1] + '<small>' + n + '</small></button>';
        }).join('') + (state.untagged ? '<button class="tab on" data-untagged="0">Untagged only ✕</button>' : '');
        $('#rows').innerHTML = rows.length ? rows.map(function (p) {
          var price = p.sale_price != null ? A.money(p.sale_price) + ' <s class="muted small">' + A.money(p.price) + '</s>' : (p.price ? A.money(p.price) : '<span class="up">Free</span>');
          return '<tr data-id="' + h(p.id) + '"' + (selected[p.id] ? ' class="sel"' : '') + '>' +
            '<td><input type="checkbox" data-sel="' + h(p.id) + '"' + (selected[p.id] ? ' checked' : '') + ' aria-label="Select ' + h(p.title) + '"></td>' +
            '<td><div class="cell-prod"><img src="' + h(A.img(p.image)) + '" alt="" loading="lazy" onerror="this.src=\'../images/store/cat-default.svg\'">' +
              '<div><a href="#/products/' + h(p.id) + '">' + h(p.title) + '</a>' + (p.featured ? ' <span class="st st-accent">featured</span>' : '') +
              (p.type === 'server_pack' ? ' <span class="st st-warn">pack</span>' : '') +
              '<span class="cell-sub">by ' + h(p.seller_name) + ' · v' + h(p.version) + '</span></div></div></td>' +
            '<td class="small">' + (p.categories.length ? p.categories.map(h).join('<br>') : '<span class="down">Not in any category</span>') + '</td>' +
            '<td>' + tagChips(p.tags) + '</td>' +
            '<td class="num">' + price + '</td>' +
            '<td>' + A.badge(p.status) + '</td>' +
            '<td class="num">' + p.sales + '</td>' +
            '<td class="small muted">' + A.ago(p.updated_at) + '</td></tr>';
        }).join('') : '<tr><td colspan="8">' + A.empty('No products found', 'Try clearing the filters.', ' <a class="link-more" href="#/products/new">Add a product →</a>') + '</td></tr>';
        var pg = $('#pager'); pg.innerHTML = '';
        pg.appendChild(A.pager(b.meta, function (n) { state.page = n; load(); }));
        renderBulk();
      }).catch(A.fail);
    }

    function selIds() { return Object.keys(selected).filter(function (k) { return selected[k]; }); }
    function renderBulk() {
      var ids = selIds();
      $('#all').checked = rows.length > 0 && rows.every(function (r) { return selected[r.id]; });
      if (!ids.length) { $('#bulk').innerHTML = ''; return; }
      $('#bulk').innerHTML = '<div class="bulkbar"><b>' + ids.length + ' selected</b>' +
        '<button class="btn btn-sm btn-primary" data-bulk="publish">Publish</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="draft">Set draft</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="feature">Feature</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="unfeature">Unfeature</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="add_tag">Add tag…</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="remove_tag">Remove tag…</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="reject">Reject…</button>' +
        '<button class="btn btn-sm btn-danger" data-bulk="delete">Delete</button>' +
        '<button class="btn btn-sm btn-ghost" data-bulk="clear">Clear</button></div>';
    }

    function bulk(action) {
      var ids = selIds();
      if (action === 'clear') { selected = {}; load(); return; }
      var send = function (extra) {
        return A.post('admin/products/bulk', Object.assign({ ids: ids, action: action }, extra || {})).then(function (b) {
          A.toast(b.data.updated + ' products updated');
          selected = {}; A.ref.reset('tags'); A.refreshCounts(); load();
        }).catch(A.fail);
      };
      if (action === 'delete') {
        return A.confirm('Delete ' + ids.length + ' products permanently? Products that were sold cannot be deleted — set them to Draft instead.', { danger: true, ok: 'Delete' })
          .then(function (y) { if (y) send(); });
      }
      if (action === 'reject') {
        return A.ask({ title: 'Reject ' + ids.length + ' products', label: 'Reason (shown to the seller)', required: true, danger: true, ok: 'Reject' })
          .then(function (r) { if (r) send({ reason: r }); });
      }
      if (action === 'add_tag' || action === 'remove_tag') {
        return A.ref.get('tags').then(function (tags) {
          A.modal({
            title: (action === 'add_tag' ? 'Add a tag to ' : 'Remove a tag from ') + ids.length + ' products',
            body: '<label class="field"><span>Tag</span><select class="input">' + tags.map(function (t) { return '<option value="' + h(t.id) + '">' + h(t.name) + (t.categories.length ? ' → ' + h(t.categories.join(', ')) : '') + '</option>'; }).join('') + '</select></label>',
            actions: [{ label: 'Cancel' }, { label: action === 'add_tag' ? 'Add tag' : 'Remove tag', kind: 'primary', onClick: function (c) { return send({ tag_id: c.body.querySelector('select').value }); } }]
          });
        });
      }
      send();
    }

    el.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-status]'))) { state.status = t.dataset.status; state.page = 1; load(); return; }
      if ((t = e.target.closest('[data-untagged]'))) { state.untagged = ''; state.page = 1; load(); return; }
      if ((t = e.target.closest('[data-bulk]'))) { bulk(t.dataset.bulk); return; }
      if (e.target.closest('input, a, button')) return;
      var tr = e.target.closest('tr[data-id]');
      if (tr) A.go('#/products/' + tr.dataset.id);
    });
    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.sel) { selected[t.dataset.sel] = t.checked; t.closest('tr').classList.toggle('sel', t.checked); renderBulk(); }
      if (t.id === 'all') { rows.forEach(function (r) { selected[r.id] = t.checked; }); load(); }
      if (t.id === 'f-type') { state.type = t.value; state.page = 1; load(); }
      if (t.id === 'f-cat') { state.category = t.value; state.page = 1; load(); }
      if (t.id === 'f-tag') { state.tag = t.value; state.page = 1; load(); }
      if (t.id === 'f-sort') { state.sort = t.value; state.page = 1; load(); }
    });
    var deb;
    $('#f-q').addEventListener('input', function (e) { clearTimeout(deb); deb = setTimeout(function () { state.q = e.target.value.trim(); state.page = 1; load(); }, 300); });

    return load();
  });

  // ============================================================
  // Rich text editor (small, dependency-free)
  // ============================================================
  function rte(host, html, placeholder, onInput) {
    host.className = 'rte';
    host.innerHTML = '<div class="rte-bar">' +
      [['bold', '<b>B</b>', 'Bold'], ['italic', '<i>I</i>', 'Italic'], ['h2', 'H2', 'Heading'], ['h3', 'H3', 'Subheading'],
       ['insertUnorderedList', '• List', 'Bullet list'], ['insertOrderedList', '1. List', 'Numbered list'], ['blockquote', '❝', 'Quote'],
       ['link', 'Link', 'Add link'], ['removeFormat', 'Clear', 'Clear formatting']].map(function (b) {
        return '<button type="button" data-cmd="' + b[0] + '" title="' + b[2] + '" aria-label="' + b[2] + '">' + b[1] + '</button>';
      }).join('') + '</div><div class="rte-area" contenteditable="true" role="textbox" aria-multiline="true" data-ph="' + h(placeholder) + '"></div>';
    var area = host.querySelector('.rte-area');
    area.innerHTML = html || '';
    host.querySelector('.rte-bar').addEventListener('mousedown', function (e) {
      var b = e.target.closest('[data-cmd]');
      if (!b) return;
      e.preventDefault();
      var c = b.dataset.cmd;
      if (c === 'h2' || c === 'h3' || c === 'blockquote') document.execCommand('formatBlock', false, c);
      else if (c === 'link') {
        A.ask({ title: 'Add link', label: 'URL (https://…)', ok: 'Add' }).then(function (u) {
          area.focus();
          if (u && /^https?:\/\//i.test(u)) document.execCommand('createLink', false, u);
          onInput();
        });
        return;
      } else document.execCommand(c, false, null);
      onInput();
    });
    area.addEventListener('input', onInput);
    area.addEventListener('paste', function (e) {
      // keep pasted content clean: plain text only
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    return { get: function () { return area.innerHTML.trim() === '<br>' ? '' : area.innerHTML; } };
  }

  /** Editable list of short strings with drag-to-reorder. */
  function listEditor(host, items, placeholder, onInput) {
    host.className = 'list-edit';
    function row(v) {
      return '<div class="list-row" draggable="true"><span class="drag" aria-hidden="true">⋮⋮</span><input class="input" value="' + h(v) + '" placeholder="' + h(placeholder) + '" maxlength="200"><button type="button" class="icon-btn" data-rm aria-label="Remove">✕</button></div>';
    }
    host.innerHTML = (items || []).map(row).join('') + '<button type="button" class="btn btn-sm btn-ghost" data-add>+ Add</button>';
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-add]')) {
        e.target.closest('[data-add]').insertAdjacentHTML('beforebegin', row(''));
        host.querySelectorAll('.list-row input')[host.querySelectorAll('.list-row').length - 1].focus();
        onInput();
      }
      if (e.target.closest('[data-rm]')) { e.target.closest('.list-row').remove(); onInput(); }
    });
    host.addEventListener('input', onInput);
    host.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('.list-row input')) { e.preventDefault(); host.querySelector('[data-add]').click(); }
    });
    var dragging = null;
    host.addEventListener('dragstart', function (e) { dragging = e.target.closest('.list-row'); });
    host.addEventListener('dragover', function (e) {
      var over = e.target.closest('.list-row');
      if (!dragging || !over || over === dragging) return;
      e.preventDefault();
      var r = over.getBoundingClientRect();
      over.parentNode.insertBefore(dragging, e.clientY < r.top + r.height / 2 ? over : over.nextSibling);
    });
    host.addEventListener('dragend', function () { dragging = null; onInput(); });
    return { get: function () { return Array.prototype.map.call(host.querySelectorAll('.list-row input'), function (i) { return i.value.trim(); }).filter(Boolean); } };
  }

  /** Screenshot manager: upload (click/drop/paste), reorder (drag), remove. First image = cover. */
  function shotsEditor(host, list, onInput) {
    var shots = (list || []).slice();
    host.innerHTML = '<div class="shots"></div><label class="drop" tabindex="0"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>' +
      '<b>Click to upload</b> or drag images here · PNG, JPG, WEBP up to 5 MB · first image is the cover</label>';
    var grid = host.querySelector('.shots'), input = host.querySelector('input'), drop = host.querySelector('.drop');
    function draw() {
      grid.innerHTML = shots.map(function (s, i) {
        return '<div class="shot" draggable="true" data-i="' + i + '"><img src="' + h(A.img(s)) + '" alt="Screenshot ' + (i + 1) + '">' +
          (i === 0 ? '<span class="cover">Cover</span>' : '') + '<button type="button" class="rm" data-rm="' + i + '" aria-label="Remove image">✕</button></div>';
      }).join('');
    }
    function upload(files) {
      Array.prototype.forEach.call(files, function (f) {
        if (!/^image\//.test(f.type)) return;
        var ph = document.createElement('div');
        ph.className = 'shot uploading';
        ph.innerHTML = '<div class="adm-loading" style="padding:0;justify-content:center;height:100%"><span class="spin"></span></div>';
        grid.appendChild(ph);
        A.upload(f, { dir: 'products' }).then(function (path) { shots.push(path); draw(); onInput(); })
          .catch(function (e) { ph.remove(); A.fail(e); });
      });
    }
    input.addEventListener('change', function () { upload(input.files); input.value = ''; });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { if (e.dataTransfer.types.indexOf('Files') !== -1) { e.preventDefault(); drop.classList.add('over'); } }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); upload(e.dataTransfer.files); });
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]');
      if (b) { shots.splice(+b.dataset.rm, 1); draw(); onInput(); }
    });
    var from = null;
    grid.addEventListener('dragstart', function (e) { var s = e.target.closest('.shot'); if (s) { from = +s.dataset.i; s.classList.add('dragging'); } });
    grid.addEventListener('dragover', function (e) { if (from !== null && e.target.closest('.shot')) e.preventDefault(); });
    grid.addEventListener('drop', function (e) {
      var s = e.target.closest('.shot');
      if (from === null || !s) return;
      e.preventDefault();
      var to = +s.dataset.i, item = shots.splice(from, 1)[0];
      shots.splice(to, 0, item);
      from = null; draw(); onInput();
    });
    grid.addEventListener('dragend', function () { from = null; draw(); });
    draw();
    return { get: function () { return shots.slice(); } };
  }

  // ============================================================
  // Product editor
  // ============================================================
  function editor(el, params) {
    var isNew = !params.id;
    A.loading(el);
    var load = isNew ? Promise.resolve({ data: { title: '', slug: '', description: '', install_guide: '', price: 0, sale_price: null, type: 'standard', status: 'DRAFT', featured: false,
      version: '1.0.0', video_url: '', changelog: '', features: [], compatibility: ['QBCore'], screenshots: [], seo_title: '', seo_description: '', tag_ids: [], pack_meta: {}, has_file: false } })
      : A.get('admin/products/' + encodeURIComponent(params.id));

    return load.then(function (b) {
      var p = b.data;
      var dirty = false, filePath = null;
      var markDirty = function () { if (!dirty) { dirty = true; var d = el.querySelector('#dirty'); if (d) d.hidden = false; } };
      A.guard(function () { return dirty; });
      var pack = p.pack_meta || {};

      el.innerHTML =
        '<form id="pform" novalidate>' +
        '<div class="editor-bar"><a class="icon-btn" href="#/products" aria-label="Back to products">←</a>' +
          '<div class="grow"><h1>' + (isNew ? 'New product' : h(p.title)) + '<span class="dirty-dot" id="dirty" title="Unsaved changes" hidden></span></h1>' +
          (isNew ? '' : '<span class="muted small">' + A.badge(p.status) + ' · by ' + h(p.seller_name || '') + ' · updated ' + A.ago(p.updated_at) + '</span>') + '</div>' +
          (!isNew && p.status === 'PUBLISHED' ? '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="../product.html?slug=' + encodeURIComponent(p.slug) + '">View ↗</a>' : '') +
          (!isNew ? '<button type="button" class="btn btn-sm btn-ghost" id="delBtn">Delete</button>' : '') +
          '<button class="btn btn-sm btn-primary" id="saveBtn" type="submit">' + (isNew ? 'Create product' : 'Save changes') + '</button>' +
        '</div>' +
        '<div class="grid g-main">' +
          '<div class="stack">' +
            '<div class="panel panel-pad form-grid">' +
              '<label class="field"><span>Title</span><input class="input" name="title" maxlength="255" required value="' + h(p.title) + '" placeholder="e.g. Advanced Police Job"></label>' +
              '<label class="field"><span>URL slug <small>leave empty to generate</small></span><input class="input mono" name="slug" maxlength="200" value="' + h(p.slug) + '" placeholder="advanced-police-job"></label>' +
              '<div class="field"><span>Description</span><div id="desc"></div></div>' +
            '</div>' +
            '<div class="panel"><div class="panel-head"><h3>Images & video</h3></div><div class="panel-pad form-grid"><div id="shots"></div>' +
              '<label class="field"><span>Video preview <small>YouTube or other https link</small></span><input class="input" name="video_url" value="' + h(p.video_url || '') + '" placeholder="https://www.youtube.com/watch?v=…"></label></div></div>' +
            '<div class="panel"><div class="panel-head"><h3>Download file</h3></div><div class="panel-pad form-grid">' +
              '<div class="filebox" id="fileBox">' + (p.has_file ? '✅ A file is attached. Upload a new one to replace it.' : '⚠️ No file yet — buyers need a download.') + '</div>' +
              '<label class="drop" tabindex="0"><input type="file" id="fileIn" accept=".zip,.rar,.7z" hidden><b>Upload .zip / .rar / .7z</b> · max 200 MB</label>' +
              '<div class="row-2"><label class="field"><span>Version</span><input class="input" name="version" maxlength="50" value="' + h(p.version || '1.0.0') + '"></label></div>' +
              '<label class="field"><span>Changelog <small>newest first</small></span><textarea class="input" name="changelog" rows="4" placeholder="v1.1.0 — Added EMS integration">' + h(p.changelog || '') + '</textarea></label>' +
            '</div></div>' +
            '<div class="panel"><div class="panel-head"><h3>Features</h3><span class="muted small">Bullet points shown on the product page</span></div><div class="panel-pad"><div id="features"></div></div></div>' +
            '<div class="panel" id="packPanel"' + (p.type === 'server_pack' ? '' : ' hidden') + '><div class="panel-head"><h3>Server pack details</h3></div><div class="panel-pad form-grid">' +
              '<div class="row-2"><label class="field"><span>Resources included</span><input class="input" name="pack_resources" type="number" min="0" value="' + h(pack.resources || '') + '" placeholder="400"></label>' +
              '<label class="field"><span>Idle resmon</span><input class="input" name="pack_resmon" maxlength="20" value="' + h(pack.resmon_idle_ms || '') + '" placeholder="0.4-0.6ms"></label></div>' +
              '<label class="switch"><span>Lifetime updates<small>Show the “Lifetime updates” badge</small></span><input type="checkbox" name="pack_lifetime"' + (pack.lifetime_updates ? ' checked' : '') + '></label>' +
            '</div></div>' +
            '<div class="panel"><div class="panel-head"><h3>Installation guide</h3></div><div class="panel-pad"><div id="install"></div></div></div>' +
          '</div>' +

          '<div class="stack">' +
            '<div class="panel panel-pad form-grid">' +
              '<label class="field"><span>Status</span><select class="input" name="status">' +
                ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'].map(function (s) { return '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + s.charAt(0) + s.slice(1).toLowerCase() + '</option>'; }).join('') +
              '</select></label>' +
              (p.reject_reason ? '<p class="small down">Rejected: ' + h(p.reject_reason) + '</p>' : '') +
              '<label class="switch"><span>Featured<small>Show on the homepage</small></span><input type="checkbox" name="featured"' + (p.featured ? ' checked' : '') + '></label>' +
              '<div class="field"><span>Type</span><div class="seg">' +
                '<label><input type="radio" name="type" value="standard"' + (p.type !== 'server_pack' ? ' checked' : '') + '><span>Standard</span></label>' +
                '<label><input type="radio" name="type" value="server_pack"' + (p.type === 'server_pack' ? ' checked' : '') + '><span>Server pack</span></label></div></div>' +
            '</div>' +
            '<div class="panel panel-pad form-grid"><div class="row-2">' +
              '<label class="field"><span>Price (USD)</span><input class="input" name="price" type="number" min="0" step="0.01" value="' + h(p.price) + '"></label>' +
              '<label class="field"><span>Sale price</span><input class="input" name="sale_price" type="number" min="0" step="0.01" value="' + h(p.sale_price == null ? '' : p.sale_price) + '" placeholder="—"></label>' +
            '</div><p class="hint small muted">Set price to 0 to make it free (it’s tagged “Free” automatically).</p></div>' +
            '<div class="panel"><div class="panel-head"><h3>Tags</h3><a class="link small" href="#/tags" target="_blank">Manage ↗</a></div><div class="panel-pad form-grid"><div id="tags"></div>' +
              '<div class="field"><span>Will appear in</span><div class="appear" id="appear"></div></div></div></div>' +
            '<div class="panel panel-pad form-grid"><div class="field"><span>Works with</span><div class="tchips" id="compat">' +
              FRAMEWORKS.map(function (f) { return '<label class="switch" style="padding:2px 0;width:100%"><span>' + f + '</span><input type="checkbox" data-fw="' + f + '"' + ((p.compatibility || []).indexOf(f) !== -1 ? ' checked' : '') + '></label>'; }).join('') +
            '</div></div></div>' +
            '<div class="panel"><div class="panel-head"><h3>Search engine (SEO)</h3></div><div class="panel-pad form-grid">' +
              '<label class="field"><span>SEO title <small id="c-st"></small></span><input class="input" name="seo_title" maxlength="255" value="' + h(p.seo_title || '') + '" placeholder="Defaults to the product title"></label>' +
              '<label class="field"><span>Meta description <small id="c-sd"></small></span><textarea class="input" name="seo_description" rows="3" maxlength="500" placeholder="1–2 sentences for Google">' + h(p.seo_description || '') + '</textarea></label>' +
            '</div></div>' +
          '</div>' +
        '</div></form>';

      var form = el.querySelector('#pform');
      var desc = rte(el.querySelector('#desc'), p.description, 'Describe the resource: what it does, requirements, highlights…', markDirty);
      var install = rte(el.querySelector('#install'), p.install_guide, 'Step-by-step install instructions…', markDirty);
      var feats = listEditor(el.querySelector('#features'), p.features, 'e.g. Fully configurable via config.lua', markDirty);
      var shots = shotsEditor(el.querySelector('#shots'), p.screenshots, markDirty);
      var tagIds = (p.tag_ids || []).slice();

      var appear = el.querySelector('#appear');
      function preview() {
        if (!tagIds.length) { appear.innerHTML = '<p class="small down">No categories yet — add a tag that belongs to a category.</p>'; return; }
        A.get('admin/catalog/categories-for-tags&tag_ids=' + tagIds.map(encodeURIComponent).join(',')).then(function (b2) {
          appear.innerHTML = b2.data.length ? b2.data.map(function (c) {
            return '<div class="appear-item' + (c.direct ? ' direct' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h6l2 2h10v10H3z"/></svg>' + h(c.path) + '</div>';
          }).join('') : '<p class="small down">These tags aren’t linked to any category yet. <a class="link" href="#/categories" target="_blank">Link them ↗</a></p>';
        }).catch(A.fail);
      }
      A.tagPicker(el.querySelector('#tags'), { selected: tagIds, allowCreate: true, onChange: function (ids) { tagIds = ids; markDirty(); preview(); } });
      preview();

      function counters() {
        el.querySelector('#c-st').textContent = form.seo_title.value.length + '/60';
        el.querySelector('#c-sd').textContent = form.seo_description.value.length + '/160';
      }
      counters();
      form.addEventListener('input', function (e) { markDirty(); if (/seo_/.test(e.target.name)) counters(); });
      form.addEventListener('change', function (e) {
        markDirty();
        if (e.target.name === 'type') el.querySelector('#packPanel').hidden = e.target.value !== 'server_pack';
      });

      // product file upload
      var fileIn = el.querySelector('#fileIn');
      fileIn.closest('.drop').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
      fileIn.addEventListener('change', function () {
        var f = fileIn.files[0];
        if (!f) return;
        var box = el.querySelector('#fileBox');
        box.innerHTML = '<span class="spin"></span> Uploading ' + h(f.name) + '…';
        A.upload(f, { kind: 'archive' }).then(function (path) {
          filePath = path; markDirty();
          box.innerHTML = '✅ ' + h(f.name) + ' uploaded (' + (f.size / 1048576).toFixed(1) + ' MB). Save to attach it.';
        }).catch(function (e) { box.innerHTML = '❌ ' + h(e.message); });
        fileIn.value = '';
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var f = A.formData(form);
        var payload = {
          title: f.title, slug: f.slug, description: desc.get(), install_guide: install.get(),
          price: f.price || 0, sale_price: f.sale_price, type: f.type, status: f.status, featured: f.featured,
          version: f.version, video_url: f.video_url, changelog: f.changelog, features: feats.get(),
          compatibility: Array.prototype.filter.call(el.querySelectorAll('[data-fw]'), function (c) { return c.checked; }).map(function (c) { return c.dataset.fw; }),
          screenshots: shots.get(), seo_title: f.seo_title, seo_description: f.seo_description, tag_ids: tagIds,
          pack_meta: { resources: f.pack_resources, resmon_idle_ms: f.pack_resmon, lifetime_updates: f.pack_lifetime, features: feats.get(),
            frameworks: Array.prototype.filter.call(el.querySelectorAll('[data-fw]'), function (c) { return c.checked; }).map(function (c) { return c.dataset.fw; }) }
        };
        if (filePath) payload.file_path = filePath;
        if (payload.status === 'PUBLISHED' && !tagIds.length) A.toast('Tip: add tags so this product shows up in categories', 'error');
        var btn = el.querySelector('#saveBtn');
        btn.disabled = true;
        A.post(isNew ? 'admin/products' : 'admin/products/' + encodeURIComponent(p.id), payload).then(function (r) {
          dirty = false;
          A.toast(isNew ? 'Product created' : 'Saved');
          A.ref.reset('tags'); A.ref.reset('categories'); A.refreshCounts();
          A.go('#/products/' + r.data.id);
        }).catch(function (err) { A.fail(err); A.fieldErrors(form, err); }).finally(function () { btn.disabled = false; });
      });

      var del = el.querySelector('#delBtn');
      if (del) del.addEventListener('click', function () {
        A.confirm('Delete “' + p.title + '” permanently? If it was sold, set it to Draft instead.', { danger: true, ok: 'Delete' }).then(function (y) {
          if (!y) return;
          A.post('admin/products/bulk', { ids: [p.id], action: 'delete' }).then(function () {
            dirty = false; A.toast('Product deleted'); A.go('#/products');
          }).catch(A.fail);
        });
      });
    });
  }
  A.rte = rte; // shared with the Articles editor (site.js)
  A.page('/products/new', function (el) { return editor(el, {}); });
  A.page('/products/:id', editor);

  // ============================================================
  // Review queue
  // ============================================================
  A.page('/review', function (el) {
    el.innerHTML = A.head('Review queue', 'Seller submissions waiting for approval. Approved products go live immediately.') + '<div class="panel" id="rq"></div>';
    var box = el.querySelector('#rq');
    function load() {
      A.loading(box);
      return A.get('admin/products&status=PENDING&per_page=50&sort=oldest').then(function (b) {
        if (!b.data.length) { box.innerHTML = A.empty('All caught up 🎉', 'No products are waiting for review.'); return; }
        return Promise.all(b.data.map(function (p) { return A.get('admin/products/' + p.id).then(function (x) { return x.data; }); })).then(function (full) {
          box.innerHTML = full.map(function (p) {
            return '<div class="rq" data-id="' + h(p.id) + '"><img src="' + h(A.img(p.screenshots[0])) + '" alt="" onerror="this.src=\'../images/store/cat-default.svg\'">' +
              '<div><h3>' + h(p.title) + '</h3><span class="muted small">by ' + h(p.seller_name) + ' · ' + A.money(p.price) + ' · submitted ' + A.ago(p.created_at) + ' · ' + (p.has_file ? 'file attached' : '<span class="down">no file</span>') + '</span>' +
              '<p class="desc">' + h(stripHtml(p.description).slice(0, 320)) + '</p>' + tagChips(p.tags) +
              '<p class="small muted" style="margin-top:6px">Categories: ' + (p.categories.filter(function (c) { return c.direct; }).map(function (c) { return h(c.path); }).join(', ') || '<span class="down">none — add tags before approving</span>') + '</p></div>' +
              '<div class="rq-actions"><button class="btn btn-sm btn-primary" data-ok>Approve</button><button class="btn btn-sm btn-ghost" data-no>Reject…</button><a class="btn btn-sm btn-ghost" href="#/products/' + h(p.id) + '">Edit</a></div></div>';
          }).join('');
        });
      }).catch(A.fail);
    }
    box.addEventListener('click', function (e) {
      var card = e.target.closest('.rq');
      if (!card) return;
      var id = card.dataset.id;
      var send = function (body) {
        return A.post('admin/products/' + id + '/review', body).then(function () {
          A.toast(body.decision === 'approve' ? 'Approved — now live' : 'Rejected');
          card.remove(); A.refreshCounts();
          if (!box.querySelector('.rq')) box.innerHTML = A.empty('All caught up 🎉', 'No products are waiting for review.');
        }).catch(A.fail);
      };
      if (e.target.closest('[data-ok]')) send({ decision: 'approve' });
      if (e.target.closest('[data-no]')) A.ask({ title: 'Reject product', label: 'Reason (the seller will see this)', required: true, danger: true, ok: 'Reject' }).then(function (r) { if (r) send({ decision: 'reject', reason: r }); });
    });
    return load();
  });
})();
