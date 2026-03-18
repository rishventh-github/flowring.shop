(function () {
  'use strict';

  var API = window.FLOWRING_API || '/api';
  var listEl = document.getElementById('blog-list');
  var loadingEl = document.getElementById('blog-loading');
  var adminActionsEl = document.getElementById('blog-admin-actions');

  if (!listEl) return;

  // Show "New post" / "Manage posts" when logged in as admin
  if (adminActionsEl) {
    fetch(API + '/admin/me', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.admin) adminActionsEl.style.display = 'flex';
      })
      .catch(function () {});
  }

  fetch(API + '/posts')
    .then(function (r) {
      if (!r.ok) throw new Error('Failed to load posts');
      return r.json();
    })
    .then(function (posts) {
      if (loadingEl) loadingEl.remove();
      if (!posts.length) {
        listEl.innerHTML = '<p class="blog-empty">No posts yet. Check back soon.</p>';
        return;
      }
      listEl.innerHTML = posts.map(function (p) {
        var date = p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
        var excerpt = (p.excerpt || '').slice(0, 160);
        if ((p.excerpt || '').length > 160) excerpt += '…';
        return (
          '<article class="blog-card scroll-reveal">' +
            '<a href="blog-post.html?slug=' + encodeURIComponent(p.slug) + '" class="blog-card__link">' +
              '<time class="blog-card__date">' + date + '</time>' +
              '<h2 class="blog-card__title">' + escapeHtml(p.title) + '</h2>' +
              (excerpt ? '<p class="blog-card__excerpt">' + escapeHtml(excerpt) + '</p>' : '') +
            '</a>' +
          '</article>'
        );
      }).join('');
      window.dispatchEvent(new Event('scroll'));
    })
    .catch(function () {
      if (loadingEl) loadingEl.textContent = 'Could not load posts.';
    });

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
