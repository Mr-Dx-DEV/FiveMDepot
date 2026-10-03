/* Admin — Articles (blog, tutorials, tools, docs & legal pages) */
(function () {
  'use strict';
  var A = window.Admin, h = A.h;
  var TYPES = { blog: 'Blog', tutorial: 'Tutorials', tool: 'Tools', doc: 'Docs & legal' };

  A.page('/articles', function (el) {
    var type = A.query().get('type') || '';
    el.innerHTML = A.head('Articles', 'Blog posts, tutorials, tools and docs. Terms, Privacy and Refund policy live under Docs & legal.',
      '<a class="btn btn-sm btn-primary" href="#/articles/new' + (type ? '?type=' + type : '') + '">+ New article</a>') +
      '<div class="panel"><div class="tabs" id="tabs"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Type</th><th>Status</th><th class="num">Views</th><th>Updated</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>';
    function load() {
      A.setQuery({ type: type });
      return A.get('admin/articles' + (type ? '&type=' + type : '')).then(function (b) {
        var c = b.meta.counts, all = Object.keys(c).reduce(function (s, k) { return s + c[k]; }, 0);
        el.querySelector('#tabs').innerHTML = '<button class="tab' + (!type ? ' on' : '') + '" data-type="">All<small>' + all + '</small></button>' +
          Object.keys(TYPES).map(function (k) { return '<button class="tab' + (type === k ? ' on' : '') + '" data-type="' + k + '">' + TYPES[k] + '<small>' + c[k] + '</small></button>'; }).join('');
        el.querySelector('#rows').innerHTML = b.data.length ? b.data.map(function (a) {
          return '<tr data-id="' + h(a.id) + '" style="cursor:pointer"><td><div class="cell-prod"><img src="' + h(A.img(a.thumbnail)) + '" alt="" onerror="this.src=\'../images/store/cat-default.svg\'">' +
            '<div><a href="#/articles/' + h(a.id) + '">' + h(a.title) + '</a><span class="cell-sub mono">' + h(a.slug) + '</span></div></div></td>' +
            '<td>' + h(TYPES[a.type] || a.type) + '</td><td>' + (a.is_published ? A.badge('published') : A.badge('draft')) + '</td><td class="num">' + a.views + '</td>' +
            '<td class="small muted">' + A.ago(a.updated_at) + '</td>' +
            '<td class="num"><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="../documentation.html?type=' + h(a.type) + '&slug=' + encodeURIComponent(a.slug) + '">View ↗</a></td></tr>';
        }).join('') : '<tr><td colspan="6">' + A.empty('No articles yet', '', ' <a class="link-more" href="#/articles/new">Write one →</a>') + '</td></tr>';
      }).catch(A.fail);
    }
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-type]');
      if (t) { type = t.dataset.type; load(); return; }
      if (e.target.closest('a')) return;
      var tr = e.target.closest('tr[data-id]');
      if (tr) A.go('#/articles/' + tr.dataset.id);
    });
    return load();
  });

  function editor(el, params) {
    var isNew = !params.id;
    A.loading(el);
    var load = isNew
      ? Promise.resolve({ data: { title: '', slug: '', type: A.query().get('type') || 'blog', category: 'general', excerpt: '', content: '', thumbnail: '', is_published: true } })
      : A.get('admin/articles/' + encodeURIComponent(params.id));
    return load.then(function (b) {
      var a = b.data, dirty = false;
      A.guard(function () { return dirty; });
      var viewUrl = '../documentation.html?type=' + encodeURIComponent(a.type) + '&slug=' + encodeURIComponent(a.slug);
      el.innerHTML = '<form id="af" novalidate><div class="editor-bar"><a class="icon-btn" href="#/articles" aria-label="Back">←</a>' +
        '<div class="grow"><h1>' + (isNew ? 'New article' : h(a.title)) + '</h1></div>' +
        (!isNew ? '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + h(viewUrl) + '">View ↗</a><button type="button" class="btn btn-sm btn-ghost" id="delA">Delete</button>' : '') +
        '<button class="btn btn-sm btn-primary" type="submit">' + (isNew ? 'Publish' : 'Save') + '</button></div>' +
        '<div class="grid g-main"><div class="panel panel-pad form-grid">' +
          '<label class="field"><span>Title</span><input class="input" name="title" maxlength="200" value="' + h(a.title) + '"></label>' +
          '<label class="field"><span>Short summary <small>shown on the list page</small></span><textarea class="input" name="excerpt" rows="2" maxlength="500">' + h(a.excerpt || '') + '</textarea></label>' +
          '<div class="field"><span>Content</span><div id="body"></div></div></div>' +
        '<div class="stack"><div class="panel panel-pad form-grid">' +
          '<label class="field"><span>Type</span><select class="input" name="type">' + Object.keys(TYPES).map(function (k) {
            return '<option value="' + k + '"' + (a.type === k ? ' selected' : '') + '>' + TYPES[k] + '</option>';
          }).join('') + '</select></label>' +
          '<label class="switch"><span>Published</span><input type="checkbox" name="is_published"' + (a.is_published ? ' checked' : '') + '></label>' +
          '<label class="field"><span>URL slug <small>auto</small></span><input class="input mono" name="slug" maxlength="200" value="' + h(a.slug) + '"></label>' +
          '<label class="field"><span>Topic</span><input class="input" name="category" maxlength="100" value="' + h(a.category || '') + '" placeholder="e.g. QBCore, Payments"></label></div>' +
          '<div class="panel panel-pad form-grid"><div class="field"><span>Cover image</span>' +
            '<img id="thPrev" src="' + h(A.img(a.thumbnail)) + '" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid var(--border)">' +
            '<input type="hidden" name="thumbnail" value="' + h(a.thumbnail || '') + '"><label class="btn btn-sm btn-ghost"><input type="file" accept="image/png,image/jpeg,image/webp" hidden id="thIn">Upload cover</label></div></div>' +
        '</div></div></form>';
      var form = el.querySelector('#af');
      var body = A.rte(el.querySelector('#body'), a.content, 'Write your article…', function () { dirty = true; });
      form.addEventListener('input', function () { dirty = true; });
      el.querySelector('#thIn').addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        A.upload(f, { dir: 'site' }).then(function (path) {
          form.thumbnail.value = path; el.querySelector('#thPrev').src = A.img(path); dirty = true;
        }).catch(A.fail);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = A.formData(form);
        d.content = body.get();
        if (!isNew) d.id = a.id;
        A.post('admin/articles', d).then(function (r) { dirty = false; A.toast('Saved'); A.go('#/articles/' + r.data.id); })
          .catch(function (err) { A.fail(err); A.fieldErrors(form, err); });
      });
      var del = el.querySelector('#delA');
      if (del) del.addEventListener('click', function () {
        A.confirm('Delete “' + a.title + '”?', { danger: true, ok: 'Delete' }).then(function (y) {
          if (y) A.post('admin/articles/' + a.id + '/delete').then(function () { dirty = false; A.toast('Deleted'); A.go('#/articles'); }).catch(A.fail);
        });
      });
    });
  }
  A.page('/articles/new', function (el) { return editor(el, {}); });
  A.page('/articles/:id', editor);
})();
