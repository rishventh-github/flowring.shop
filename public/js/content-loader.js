(function () {
  'use strict';

  var API = window.FLOWRING_API || '/api';
  fetch(API + '/content')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (content) {
      Object.keys(content).forEach(function (key) {
        var el = document.querySelector('[data-content-key="' + key + '"]');
        if (!el) return;
        var item = content[key];
        if (item.type === 'image' && item.value) {
          if (el.tagName === 'IMG') {
            el.src = item.value;
            el.alt = el.alt || key;
          } else {
            el.style.backgroundImage = 'url(' + item.value + ')';
          }
        } else if (item.value !== undefined && item.value !== '') {
          el.innerHTML = item.value;
        }
      });
    })
    .catch(function () {});
})();
