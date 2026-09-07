(function () {
  'use strict';

  // Page transitions — intercept links and use View Transitions API when available
  function setupPageTransitions() {
    var supportsViewTransition = typeof document.startViewTransition === 'function';
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link || link.target === '_blank' || link.href.startsWith('#') || link.getAttribute('href') === '#') return;
      try {
        var url = new URL(link.href);
        if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
        if (!/\.html?$/.test(url.pathname) && url.pathname !== '/') return;
      } catch (_) { return; }
      e.preventDefault();
      if (supportsViewTransition) {
        document.startViewTransition(function () {
          window.location.href = link.href;
        });
      } else {
        window.location.href = link.href;
      }
    });
  }
  setupPageTransitions();

  // Fallback: main has class page-enter in HTML; remove it if View Transitions will handle the transition
  function setupPageEnterFallback() {
    var main = document.querySelector('main');
    if (!main) return;
    if (typeof document.startViewTransition === 'function') {
      main.classList.remove('page-enter');
      return;
    }
    setTimeout(function () {
      main.classList.remove('page-enter');
    }, 500);
  }

  function init() {
    setupPageEnterFallback();

    // Mobile nav toggle
    var navToggle = document.querySelector('.nav-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
        navLinks.classList.toggle('is-open');
      });
      navLinks.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          navLinks.classList.remove('is-open');
        });
      });
    }

    // Highlight current page in nav
    setActiveNavLink();

    // Scroll reveal — pop up when elements enter viewport
    var revealEls = document.querySelectorAll('.scroll-reveal');
    if (revealEls.length === 0) return;

    function setVisible(el) {
      el.classList.add('is-visible');
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setVisible(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0
      });
      revealEls.forEach(function (el) {
        observer.observe(el);
      });
    } else {
      // Fallback: show all after short delay
      revealEls.forEach(function (el) {
        setTimeout(function () { setVisible(el); }, 100);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function normalizePathname(pathname) {
    if (!pathname) return '/';
    if (pathname === '/') return '/';
    if (/\/index\.html$/.test(pathname)) return '/index.html';
    return pathname;
  }

  function setActiveNavLink() {
    var nav = document.querySelector('.nav-links');
    if (!nav) return;

    var current = normalizePathname(window.location.pathname);
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
    if (links.length === 0) return;

    // Clear previous states
    links.forEach(function (a) {
      a.classList.remove('is-current');
      if (a.getAttribute('aria-current') === 'page') a.removeAttribute('aria-current');
    });

    function isMatch(linkPath) {
      var linkNormalized = normalizePathname(linkPath);
      if (current === '/' && (linkNormalized === '/' || linkNormalized === '/index.html')) return true;
      if (current === '/index.html' && (linkNormalized === '/' || linkNormalized === '/index.html')) return true;
      return current === linkNormalized;
    }

    var best = null;
    links.forEach(function (a) {
      try {
        var url = new URL(a.getAttribute('href'), window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (isMatch(url.pathname)) best = a;
      } catch (_) {}
    });

    if (best) {
      best.classList.add('is-current');
      best.setAttribute('aria-current', 'page');
    }
  }
})();
