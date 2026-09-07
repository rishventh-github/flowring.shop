(function () {
  'use strict';

  function onClick(e) {
    var el = e.target.closest('[data-cart-add]');
    if (!el) return;
    // Always block ordering for now
    e.preventDefault();
    alert('Ordering is coming soon.');
  }

  document.addEventListener('click', onClick);
})();

