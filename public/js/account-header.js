(function () {
  var profileEl = document.getElementById('header-profile');
  var profileBtn = document.getElementById('header-profile-btn');
  var profileAvatar = document.getElementById('header-profile-avatar');
  var profileDropdown = document.getElementById('header-profile-dropdown');
  var logoutBtn = document.getElementById('header-profile-logout');
  var navAccountItem = document.getElementById('nav-account-item');
  var heroGreeting = document.getElementById('hero-greeting');
  var heroAccountLinks = document.getElementById('hero-account-links');
  var lastGreeting = '';

  function setProfile(user) {
    if (!user) return;
    if (profileEl) profileEl.style.display = 'block';
    if (navAccountItem) navAccountItem.style.display = 'none';
    var letter = (user.name && user.name.trim()) ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');
    if (profileAvatar) profileAvatar.textContent = letter;
    var displayName = (user.name && user.name.trim()) ? user.name.trim() : (user.email || '');
    if (heroGreeting) {
      var text = 'Hello, ' + displayName + '.';
      if (text !== lastGreeting) typeGreeting(heroGreeting, text);
      heroGreeting.style.display = 'block';
    }
    if (heroAccountLinks) heroAccountLinks.style.display = 'none';
  }

  function clearProfile() {
    if (profileEl) profileEl.style.display = 'none';
    if (navAccountItem) navAccountItem.style.display = '';
    if (profileDropdown) profileDropdown.classList.remove('is-open');
    if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
    if (heroGreeting) {
      heroGreeting.textContent = '';
      heroGreeting.style.display = 'none';
      heroGreeting.classList.remove('hero__greeting--typed', 'hero__greeting--typing');
      heroGreeting.removeAttribute('aria-label');
    }
    if (heroAccountLinks) heroAccountLinks.style.display = '';
    lastGreeting = '';
  }

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = profileDropdown.classList.toggle('is-open');
      profileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function () {
      profileDropdown.classList.remove('is-open');
      if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      fetch('/api/account/logout', { method: 'POST', credentials: 'include' })
        .then(function () { clearProfile(); window.location.reload(); });
    });
  }

  fetch('/api/account/me', { credentials: 'include' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.user) setProfile(data.user);
      else clearProfile();
    })
    .catch(function () { clearProfile(); });

  function typeGreeting(el, fullText) {
    lastGreeting = fullText;
    if (!el) return;

    el.classList.add('hero__greeting--typed');

    // Respect reduced motion: no typing animation.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = fullText;
      el.classList.remove('hero__greeting--typing');
      return;
    }

    el.classList.add('hero__greeting--typing');
    el.setAttribute('aria-label', fullText);
    el.textContent = '';

    var i = 0;
    var speed = 55; // ms per char (slower typing)
    var timer = window.setInterval(function () {
      // If a newer greeting was requested, stop this animation.
      if (fullText !== lastGreeting) { window.clearInterval(timer); return; }

      i += 1;
      el.textContent = fullText.slice(0, i);
      if (i >= fullText.length) {
        window.clearInterval(timer);
        el.classList.remove('hero__greeting--typing');
      }
    }, speed);
  }
})();
