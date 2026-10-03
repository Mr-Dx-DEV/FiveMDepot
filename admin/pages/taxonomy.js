/* Admin — Categories (drag & drop tree) and Tags */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;

  // Same keyword → icon logic as the storefront (js/store.js)
  var ICONS = {
    server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    car: '<path d="M5 16H3v-4l2-5h11l3 5h2v4h-2"/><circle cx="7.5" cy="16.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
    building: '<path d="M4 21V5l8-3v19M12 8l8 3v10M2 21h20"/>',
    map: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    shirt: '<path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/>',
    ui: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
    job: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
    weapon: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    box: '<path d="m21 8-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'
  };
  var RULES = [[/\bui\b|hud|menu|inventory/, 'ui'], [/server|\bpacks?\b|bundle/, 'server'], [/vehicle|\bcars?\b|bike|heli|boat/, 'car'],
    [/mlo|interior|building/, 'building'], [/\bmaps?\b/, 'map'], [/cloth|eup|outfit|wear/, 'shirt'], [/free|gift/, 'gift'], [/job|police|ems|gang/, 'job'], [/weapon|gun/, 'weapon'], [/script|code|system|tool/, 'code']];
  function iconKey(c) {
    var s = ((c.slug || '') + ' ' + (c.name || '')).toLowerCase();
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(s)) return RULES[i][1];
    return 'box';
  }
  function catIcon(c) {
    var k = iconKey(c);
    return '<span class="di"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</svg></span>';
  }

  // ============================================================
  // Categories
  // ============================================================
  A.page('/categories', function (el) {
    var cats = [], tags = [], current = null, dirty = false;
    A.guard(function () { return dirty; });

    el.innerHTML = A.head('Categories', 'Drag to reorder or drop onto another category to nest it. Products appear in a category when they have one of its tags.',
      '<button class="btn btn-sm btn-primary" id="newCat">+ New category</button>') +
      '<div class="grid g-2" style="grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);align-items:start">' +
        '<div class="panel"><div class="panel-head"><h3>Category tree</h3><span class="muted small" id="treeInfo"></span></div><div class="tree" id="tree"></div></div>' +
        '<div class="panel" id="editPanel"></div>' +
      '</div>';
    var tree = el.querySelector('#tree'), panel = el.querySelector('#editPanel');

    function byParent(pid) { return cats.filter(function (c) { return (c.parent_id || null) === pid; }).sort(function (a, b) { return a.order - b.order || a.name.localeCompare(b.name); }); }

    function drawTree() {
      function node(c) {
        var kids = byParent(c.id);
        return '<div class="tnode" data-id="' + h(c.id) + '"><div class="trow' + (current && current.id === c.id ? ' on' : '') + (c.is_active ? '' : ' off') + '" draggable="true" data-id="' + h(c.id) + '">' +
          '<span class="grip" aria-hidden="true">⋮⋮</span>' + catIcon(c) + '<span class="nm">' + h(c.name) + '</span>' +
          (c.show_in_nav ? '<span class="st st-accent">menu</span>' : '') +
          '<span class="meta">' + c.product_count + ' products · ' + c.tag_ids.length + ' tags</span></div>' +
          (kids.length ? '<div class="tkids">' + kids.map(node).join('') + '</div>' : '') + '</div>';
      }
      var roots = byParent(null);
      tree.innerHTML = roots.length ? roots.map(node).join('') : A.empty('No categories yet', 'Create your first category.');
      el.querySelector('#treeInfo').textContent = cats.length + ' categories';
    }

    function tagName(id) { var t = tags.filter(function (x) { return x.id === id; })[0]; return t ? t.name : '?'; }

    function drawEditor(c) {
      current = c;
      drawTree();
      var isNew = !c.id;
      var parents = A.categoryOptions(cats).filter(function (o) {
        if (isNew) return true;
        // cannot pick itself or a descendant as parent
        var x = cats.filter(function (k) { return k.id === o.id; })[0], seen = {};
        while (x && !seen[x.id]) { if (x.id === c.id) return false; seen[x.id] = 1; x = cats.filter(function (k) { return k.id === x.parent_id; })[0]; }
        return true;
      });
      panel.innerHTML = '<div class="panel-head"><h3>' + (isNew ? 'New category' : 'Edit “' + h(c.name) + '”') + '</h3>' +
        (!isNew ? '<a class="link small" target="_blank" rel="noopener" href="../category.html?c=' + encodeURIComponent(c.slug) + '">View ↗</a>' : '') + '</div>' +
        '<form class="panel-pad form-grid" id="cform" novalidate>' +
          '<div class="row-2"><label class="field"><span>Name</span><input class="input" name="name" required maxlength="100" value="' + h(c.name || '') + '" placeholder="e.g. Police Jobs"></label>' +
          '<label class="field"><span>URL slug <small>auto</small></span><input class="input mono" name="slug" maxlength="100" value="' + h(c.slug || '') + '"></label></div>' +
          '<label class="field"><span>Parent category</span><select class="input" name="parent_id"><option value="">— Top level —</option>' +
            parents.map(function (o) { return '<option value="' + h(o.id) + '"' + (o.id === c.parent_id ? ' selected' : '') + '>' + '  '.repeat(o.depth) + h(o.path.split(' › ').pop()) + '</option>'; }).join('') + '</select></label>' +
          '<div class="field"><span>Tags this category owns <small>products with any of these appear here</small></span><div id="ctags"></div></div>' +
          '<label class="field"><span>Description</span><textarea class="input" name="description" rows="2" maxlength="2000">' + h(c.description || '') + '</textarea></label>' +
          '<div class="field"><span>Category image <small>what customers see on the homepage & category page</small></span>' +
            '<div class="catimg"><img id="bannerPrev" src="../images/store/cat-default.svg" alt="Category image preview">' +
            '<div class="catimg-side"><span class="small" id="bannerState"></span>' +
            '<input type="hidden" name="banner_url" value="' + h(c.banner_url || '') + '">' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-sm btn-primary"><input type="file" accept="image/png,image/jpeg,image/webp" hidden id="bannerIn">Upload image</label>' +
            '<button type="button" class="btn btn-sm btn-ghost" id="bannerClear">Use automatic</button></div></div></div>' +
            '<div id="bannerPick"></div></div>' +
          '<label class="switch"><span>Show in top menu<small>Top-level categories only appear in the header menu when this is on</small></span><input type="checkbox" name="show_in_nav"' + (c.show_in_nav ? ' checked' : '') + '></label>' +
          '<label class="switch"><span>Active<small>Hidden from the store when off</small></span><input type="checkbox" name="is_active"' + (c.is_active !== false ? ' checked' : '') + '></label>' +
          '<details><summary class="link small" style="cursor:pointer">SEO</summary><div class="form-grid" style="margin-top:10px">' +
            '<label class="field"><span>SEO title</span><input class="input" name="seo_title" maxlength="255" value="' + h(c.seo_title || '') + '"></label>' +
            '<label class="field"><span>Meta description</span><textarea class="input" name="seo_description" rows="2" maxlength="500">' + h(c.seo_description || '') + '</textarea></label></div></details>' +
          '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">' +
            (!isNew ? '<button type="button" class="btn btn-sm btn-ghost" id="delCat">Delete</button>' : '<span></span>') +
            '<div style="display:flex;gap:8px">' + (!isNew ? '<button type="button" class="btn btn-sm btn-ghost" id="addChild">+ Sub-category</button>' : '') +
            '<button class="btn btn-sm btn-primary" type="submit">' + (isNew ? 'Create category' : 'Save') + '</button></div></div>' +
        '</form>';
      var form = panel.querySelector('#cform');
      var tagIds = (c.tag_ids || []).slice();
      A.tagPicker(panel.querySelector('#ctags'), { selected: tagIds, allowCreate: true, onChange: function (ids) { tagIds = ids; dirty = true; } });
      form.addEventListener('input', function () { dirty = true; });
      panel.querySelector('#bannerIn').addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        panel.querySelector('#bannerState').textContent = 'Uploading…';
        A.upload(f, { dir: 'categories' }).then(function (path) {
          form.banner_url.value = path; dirty = true; drawBanner();
        }).catch(function (err) { A.fail(err); drawBanner(); });
        e.target.value = '';
      });
      // ---- Category image: own banner → auto (newest featured product image) → illustration
      var autoImg = null;
      var art = '../images/store/cat-' + ({ server: 'server-packs', car: 'vehicles', building: 'mlos-maps', map: 'mlos-maps', shirt: 'clothing', gift: 'free-assets', box: 'default' }[iconKey(c)] || 'scripts') + '.svg';
      function drawBanner() {
        var own = form.banner_url.value;
        panel.querySelector('#bannerPrev').src = own ? A.img(own) : autoImg ? A.img(autoImg) : art;
        panel.querySelector('#bannerState').innerHTML = own ? '✅ Using your image'
          : autoImg ? '⚡ Automatic — the newest featured product photo in this category (updates by itself)'
          : '🎨 Illustration — add products with screenshots or upload an image';
        panel.querySelectorAll('[data-pick]').forEach(function (b) { b.classList.toggle('on', b.dataset.pick === own); });
      }
      panel.querySelector('#bannerClear').addEventListener('click', function () { form.banner_url.value = ''; dirty = true; drawBanner(); });
      panel.querySelector('#bannerPick').addEventListener('click', function (e) {
        var b = e.target.closest('[data-pick]');
        if (!b) return;
        form.banner_url.value = b.dataset.pick; dirty = true; drawBanner();
      });
      if (!isNew) {
        A.get('admin/categories/' + c.id + '/images').then(function (r) {
          autoImg = r.data.auto;
          if (r.data.images.length) {
            panel.querySelector('#bannerPick').innerHTML = '<span class="small muted" style="display:block;margin:10px 0 6px">Or pick a product photo:</span><div class="catimg-grid">' +
              r.data.images.map(function (im) {
                return '<button type="button" data-pick="' + h(im.url) + '" title="' + h(im.product) + '"><img src="' + h(A.img(im.url)) + '" alt="" loading="lazy"></button>';
              }).join('') + '</div>';
          }
          drawBanner();
        }).catch(function () { drawBanner(); });
      }
      drawBanner();
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = A.formData(form);
        d.tag_ids = tagIds;
        A.post(isNew ? 'admin/categories' : 'admin/categories/' + c.id, d).then(function (b) {
          dirty = false;
          A.toast(isNew ? 'Category created' : 'Saved');
          A.ref.reset('categories'); A.ref.reset('tags');
          return reload(b.data.id);
        }).catch(function (err) { A.fail(err); A.fieldErrors(form, err); });
      });
      var del = panel.querySelector('#delCat');
      if (del) del.addEventListener('click', function () {
        A.confirm('Delete “' + c.name + '”? Products are not deleted — they just stop appearing in this category.', { danger: true, ok: 'Delete' }).then(function (y) {
          if (!y) return;
          A.post('admin/categories/' + c.id + '/delete').then(function () { dirty = false; A.toast('Category deleted'); A.ref.reset('categories'); reload(null); }).catch(A.fail);
        });
      });
      var add = panel.querySelector('#addChild');
      if (add) add.addEventListener('click', function () { drawEditor({ parent_id: c.id, is_active: true, tag_ids: [] }); });
      if (!isNew && !tagIds.length) A.toast('“' + c.name + '” owns no tags, so it shows no products yet', 'error');
    }

    function reload(selectId) {
      return Promise.all([A.get('admin/categories'), A.ref.get('tags')]).then(function (r) {
        cats = r[0].data; tags = r[1];
        var want = selectId || A.query().get('id');
        var sel = cats.filter(function (c) { return c.id === want; })[0];
        if (sel) drawEditor(sel);
        else { current = null; drawTree(); panel.innerHTML = '<div class="panel-pad">' + A.empty('Select a category', 'Click a category on the left to edit it, or create a new one.') + '</div>'; }
      });
    }

    tree.addEventListener('click', function (e) {
      var row = e.target.closest('.trow');
      if (!row) return;
      var go = function () { dirty = false; drawEditor(cats.filter(function (c) { return c.id === row.dataset.id; })[0]); };
      if (dirty) A.confirm('Discard unsaved changes?', { ok: 'Discard', danger: true }).then(function (y) { if (y) go(); }); else go();
    });
    el.querySelector('#newCat').addEventListener('click', function () { drawEditor({ is_active: true, show_in_nav: false, tag_ids: [] }); });

    // ---- drag & drop: top/bottom third → before/after, middle → nest inside
    var dragId = null;
    tree.addEventListener('dragstart', function (e) {
      var row = e.target.closest('.trow');
      if (!row) return;
      dragId = row.dataset.id;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {}
    });
    function clearMarks() { tree.querySelectorAll('.drop-in,.drop-before,.drop-after,.dragging').forEach(function (n) { n.classList.remove('drop-in', 'drop-before', 'drop-after', 'dragging'); }); }
    function zone(row, e) {
      var r = row.getBoundingClientRect(), y = e.clientY - r.top;
      return y < r.height * 0.3 ? 'before' : y > r.height * 0.7 ? 'after' : 'in';
    }
    function isDescendant(id, ofId) {
      var x = cats.filter(function (c) { return c.id === id; })[0], seen = {};
      while (x && !seen[x.id]) { if (x.id === ofId) return true; seen[x.id] = 1; x = cats.filter(function (c) { return c.id === x.parent_id; })[0]; }
      return false;
    }
    tree.addEventListener('dragover', function (e) {
      var row = e.target.closest('.trow');
      if (!dragId || !row || row.dataset.id === dragId || isDescendant(row.dataset.id, dragId)) return;
      e.preventDefault();
      tree.querySelectorAll('.drop-in,.drop-before,.drop-after').forEach(function (n) { n.classList.remove('drop-in', 'drop-before', 'drop-after'); });
      row.classList.add('drop-' + zone(row, e));
    });
    tree.addEventListener('dragend', function () { dragId = null; clearMarks(); });
    tree.addEventListener('drop', function (e) {
      var row = e.target.closest('.trow');
      if (!dragId || !row || row.dataset.id === dragId) return;
      e.preventDefault();
      var where = zone(row, e), target = cats.filter(function (c) { return c.id === row.dataset.id; })[0];
      var moving = cats.filter(function (c) { return c.id === dragId; })[0];
      var newParent = where === 'in' ? target.id : (target.parent_id || null);
      var siblings = byParent(newParent).filter(function (c) { return c.id !== moving.id; });
      var idx = where === 'in' ? siblings.length : siblings.indexOf(target) + (where === 'after' ? 1 : 0);
      siblings.splice(idx, 0, moving);
      var items = siblings.map(function (c, i) { return { id: c.id, parent_id: newParent, order: i + 1 }; });
      dragId = null; clearMarks();
      A.post('admin/categories/reorder', { items: items }).then(function () {
        A.toast(where === 'in' ? 'Moved into “' + target.name + '”' : 'Order saved');
        A.ref.reset('categories');
        reload(current && current.id);
      }).catch(A.fail);
    });

    return reload(null);
  });

  // ============================================================
  // Tags
  // ============================================================
  A.page('/tags', function (el) {
    var tags = [], groups = [], cats = [], filter = { q: '', group: '' };

    el.innerHTML = A.head('Tags', 'Tags connect products to categories. Group them (Framework, Type…) to show as filters in the shop.',
      '<button class="btn btn-sm btn-ghost" id="mergeBtn">Merge tags</button><button class="btn btn-sm btn-ghost" id="newGroup">+ Group</button><button class="btn btn-sm btn-primary" id="newTag">+ New tag</button>') +
      '<div class="panel"><div class="tools"><input class="input grow" id="tq" type="search" placeholder="Search tags…"><select class="input" id="tg"><option value="">All groups</option></select>' +
      '<label class="switch" style="gap:8px"><span class="small">Unused only</span><input type="checkbox" id="tu"></label></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tag</th><th>Group</th><th>Belongs to categories</th><th class="num">Products</th><th></th></tr></thead><tbody id="trows"></tbody></table></div></div>' +
      '<h3 style="margin:28px 0 12px;font-size:17px">Tag groups</h3><div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Group</th><th>Shop filter</th><th class="num">Tags</th><th></th></tr></thead><tbody id="grows"></tbody></table></div></div>';

    function draw() {
      var q = filter.q.toLowerCase(), unused = el.querySelector('#tu').checked;
      var list = tags.filter(function (t) {
        return (!q || t.name.toLowerCase().indexOf(q) !== -1) && (!filter.group || (t.group_id || '') === filter.group) && (!unused || !t.product_count);
      });
      el.querySelector('#trows').innerHTML = list.length ? list.map(function (t) {
        return '<tr data-id="' + h(t.id) + '"><td><span class="tchip" style="font-size:13px"><i style="background:' + h(t.color || 'var(--accent)') + '"></i>' + h(t.name) + '</span> <span class="mono muted">' + h(t.slug) + '</span></td>' +
          '<td>' + (t.group_name ? h(t.group_name) : '<span class="muted">—</span>') + '</td>' +
          '<td class="small">' + (t.categories.length ? t.categories.map(h).join(', ') : '<span class="muted">none</span>') + '</td>' +
          '<td class="num"><a class="link" href="#/products?tag=' + h(t.id) + '">' + t.product_count + '</a></td>' +
          '<td class="num"><button class="btn btn-sm btn-ghost" data-edit>Edit</button> <button class="btn btn-sm btn-ghost" data-del>Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="5">' + A.empty('No tags found', '') + '</td></tr>';
      el.querySelector('#grows').innerHTML = groups.length ? groups.map(function (g) {
        return '<tr data-gid="' + h(g.id) + '"><td><b>' + h(g.name) + '</b></td><td>' + (+g.show_as_filter ? '<span class="st st-ok">shown</span>' : '<span class="st st-muted">hidden</span>') + '</td><td class="num">' + g.tag_count + '</td>' +
          '<td class="num"><button class="btn btn-sm btn-ghost" data-gedit>Edit</button> <button class="btn btn-sm btn-ghost" data-gdel>Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="4">' + A.empty('No groups', '') + '</td></tr>';
    }

    function reload() {
      A.ref.reset('tags');
      return Promise.all([A.ref.get('tags'), A.get('admin/tag-groups'), A.ref.get('categories')]).then(function (r) {
        tags = r[0]; groups = r[1].data; cats = r[2];
        var sel = el.querySelector('#tg');
        sel.innerHTML = '<option value="">All groups</option>' + groups.map(function (g) { return '<option value="' + h(g.id) + '">' + h(g.name) + '</option>'; }).join('');
        sel.value = filter.group;
        draw();
        var focus = A.query().get('id');
        if (focus) { var t = tags.filter(function (x) { return x.id === focus; })[0]; if (t) { editTag(t); A.setQuery({}); } }
      });
    }

    function editTag(t) {
      t = t || { name: '', color: '#f97316', group_id: '' };
      var catOpts = A.categoryOptions(cats);
      var owned = cats.filter(function (c) { return c.tag_ids.indexOf(t.id) !== -1; }).map(function (c) { return c.id; });
      A.modal({
        title: t.id ? 'Edit tag' : 'New tag',
        body: '<form class="form-grid" novalidate>' +
          '<div class="row-2"><label class="field"><span>Name</span><input class="input" name="name" maxlength="100" value="' + h(t.name) + '" required></label>' +
          '<label class="field"><span>Color</span><input class="input" name="color" type="color" value="' + h(t.color || '#f97316') + '" style="padding:4px;height:40px"></label></div>' +
          '<label class="field"><span>Group</span><select class="input" name="group_id"><option value="">— None —</option>' + groups.map(function (g) { return '<option value="' + h(g.id) + '"' + (g.id === t.group_id ? ' selected' : '') + '>' + h(g.name) + '</option>'; }).join('') + '</select></label>' +
          (t.id ? '' : '<label class="field"><span>Add to categories <small>products with this tag will appear there</small></span><select class="input" name="cats" multiple size="6">' +
            catOpts.map(function (o) { return '<option value="' + h(o.id) + '">' + h(o.path) + '</option>'; }).join('') + '</select><span class="hint">Ctrl/Cmd-click to pick several</span></label>') +
          (t.id && owned.length ? '<p class="small muted">Belongs to: ' + owned.map(function (id) { return h(catOpts.filter(function (o) { return o.id === id; })[0].path); }).join(', ') + ' — change this on the Categories page.</p>' : '') +
          '</form>',
        actions: [{ label: 'Cancel' }, { label: t.id ? 'Save' : 'Create tag', kind: 'primary', onClick: function (ctx) {
          var form = ctx.body.querySelector('form'), d = A.formData(form);
          if (!t.id) d.category_ids = Array.prototype.map.call(form.cats.selectedOptions, function (o) { return o.value; });
          return A.post(t.id ? 'admin/tags/' + t.id : 'admin/tags', d).then(function () {
            A.toast(t.id ? 'Tag saved' : 'Tag created'); A.ref.reset('categories'); reload();
          }).catch(function (err) { A.fieldErrors(form, err); throw err; });
        } }]
      });
    }

    function editGroup(g) {
      g = g || { name: '', show_as_filter: 1, sort_order: groups.length + 1 };
      A.modal({
        title: g.id ? 'Edit group' : 'New tag group',
        body: '<form class="form-grid"><label class="field"><span>Name</span><input class="input" name="name" maxlength="100" value="' + h(g.name) + '" placeholder="e.g. Framework"></label>' +
          '<label class="field"><span>Position</span><input class="input" name="sort_order" type="number" value="' + h(g.sort_order) + '"></label>' +
          '<label class="switch"><span>Show as a filter in the shop</span><input type="checkbox" name="show_as_filter"' + (+g.show_as_filter ? ' checked' : '') + '></label></form>',
        actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: function (ctx) {
          var form = ctx.body.querySelector('form');
          return A.post(g.id ? 'admin/tag-groups/' + g.id : 'admin/tag-groups', A.formData(form)).then(function () { A.toast('Group saved'); reload(); })
            .catch(function (err) { A.fieldErrors(form, err); throw err; });
        } }]
      });
    }

    function merge() {
      var opts = tags.map(function (t) { return '<option value="' + h(t.id) + '">' + h(t.name) + ' (' + t.product_count + ')</option>'; }).join('');
      A.modal({
        title: 'Merge tags',
        body: '<p class="muted small">All products and categories using the first tag move to the second one. The first tag is then deleted.</p>' +
          '<label class="field"><span>Merge this tag…</span><select class="input" id="mf">' + opts + '</select></label>' +
          '<label class="field"><span>…into this tag</span><select class="input" id="mi">' + opts + '</select></label>',
        actions: [{ label: 'Cancel' }, { label: 'Merge', kind: 'danger', onClick: function (ctx) {
          return A.post('admin/tags/merge', { from_id: ctx.body.querySelector('#mf').value, into_id: ctx.body.querySelector('#mi').value })
            .then(function () { A.toast('Tags merged'); A.ref.reset('categories'); reload(); });
        } }]
      });
    }

    el.querySelector('#newTag').addEventListener('click', function () { editTag(null); });
    el.querySelector('#newGroup').addEventListener('click', function () { editGroup(null); });
    el.querySelector('#mergeBtn').addEventListener('click', merge);
    el.querySelector('#tq').addEventListener('input', function (e) { filter.q = e.target.value; draw(); });
    el.querySelector('#tg').addEventListener('change', function (e) { filter.group = e.target.value; draw(); });
    el.querySelector('#tu').addEventListener('change', draw);
    el.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]'), gr = e.target.closest('tr[data-gid]');
      if (tr) {
        var t = tags.filter(function (x) { return x.id === tr.dataset.id; })[0];
        if (e.target.closest('[data-edit]')) editTag(t);
        if (e.target.closest('[data-del]')) A.confirm('Delete tag “' + t.name + '”? It will be removed from ' + t.product_count + ' products and ' + t.categories.length + ' categories.', { danger: true, ok: 'Delete' })
          .then(function (y) { if (y) A.post('admin/tags/' + t.id + '/delete').then(function () { A.toast('Tag deleted'); A.ref.reset('categories'); reload(); }).catch(A.fail); });
      }
      if (gr) {
        var g = groups.filter(function (x) { return x.id === gr.dataset.gid; })[0];
        if (e.target.closest('[data-gedit]')) editGroup(g);
        if (e.target.closest('[data-gdel]')) A.confirm('Delete group “' + g.name + '”? Its tags are kept (ungrouped).', { danger: true, ok: 'Delete' })
          .then(function (y) { if (y) A.post('admin/tag-groups/' + g.id + '/delete').then(function () { A.toast('Group deleted'); reload(); }).catch(A.fail); });
      }
    });
    return reload();
  });
})();
