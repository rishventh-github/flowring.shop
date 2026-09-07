(function () {
  'use strict';

  var API = window.FLOWRING_API || '/api';
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');
  var wrap = document.getElementById('blog-post');
  var loading = document.getElementById('blog-loading');

  if (!wrap || !slug) {
    if (loading) loading.textContent = 'Post not found.';
    return;
  }

  fetch(API + '/posts/' + encodeURIComponent(slug))
    .then(function (r) {
      if (!r.ok) throw new Error('Not found');
      return r.json();
    })
    .then(function (post) {
      if (loading) loading.remove();
      var date = post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      wrap.innerHTML = (
        '<div class="blog-post">' +
          '<header class="blog-post__header">' +
            '<a href="blogs.html" class="blog-post__back">← Back to Blog</a>' +
            '<time class="blog-post__date">' + date + '</time>' +
            '<h1 class="blog-post__title">' + escapeHtml(post.title) + '</h1>' +
          '</header>' +
          '<div class="blog-post__body">' + post.body + '</div>' +
        '</div>'
      );
      document.title = (post.title || 'Post') + ' — FlowRing | flowring.shop';
    })
    .catch(function () {
      if (loading) loading.textContent = 'Post not found.';
    });

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
})();
