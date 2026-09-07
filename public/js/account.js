(function () {
  var messageEl = document.getElementById('account-message');
  var accountForms = document.getElementById('account-forms');
  var accountDashboard = document.getElementById('account-dashboard');
  var dashboardEmail = document.getElementById('dashboard-email');
  var cartContent = document.getElementById('cart-content');
  var formLogin = document.getElementById('form-login');
  var formSignup = document.getElementById('form-signup');
  var tabLogin = document.getElementById('tab-login');
  var tabSignup = document.getElementById('tab-signup');
  var btnLogout = document.getElementById('btn-logout');
  var adminShortcut = document.getElementById('admin-shortcut');

  function showMessage(text, type) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = 'account-message ' + (type || '');
    messageEl.style.display = 'block';
  }

  function hideMessage() {
    if (messageEl) messageEl.style.display = 'none';
  }

  function switchTab(showLogin) {
    if (tabLogin) tabLogin.classList.toggle('active', showLogin);
    if (tabSignup) tabSignup.classList.toggle('active', !showLogin);
    if (formLogin) formLogin.style.display = showLogin ? 'block' : 'none';
    if (formSignup) formSignup.style.display = showLogin ? 'none' : 'block';
    hideMessage();
  }

  if (tabLogin) tabLogin.addEventListener('click', function (e) { e.preventDefault(); switchTab(true); });
  if (tabSignup) tabSignup.addEventListener('click', function (e) { e.preventDefault(); switchTab(false); });

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderCart(items) {
    if (!cartContent) return;
    if (!items || items.length === 0) {
      cartContent.innerHTML = '<p class="cart-empty">Your cart is empty. <a href="pricing.html">Add FlowRing to your cart</a>.</p>';
      return;
    }
    var total = 0;
    var list = items.map(function (item) {
      var sub = item.price_cents * item.quantity;
      total += sub;
      return '<li data-id="' + item.id + '"><div><span class="cart-item__name">' + escapeHtml(item.product_name) + '</span><span class="cart-item__meta"> × ' + item.quantity + ' — $' + (sub / 100).toFixed(2) + '</span></div><button type="button" class="btn-remove-cart" data-id="' + item.id + '" aria-label="Remove">Remove</button></li>';
    }).join('');
    cartContent.innerHTML = '<ul class="cart-list">' + list + '</ul><p class="cart-total">Total: $' + (total / 100).toFixed(2) + '</p>';
    cartContent.querySelectorAll('.btn-remove-cart').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        fetch('/api/account/cart/' + id, { method: 'DELETE', credentials: 'include' }).then(function (r) { return r.json(); }).then(function () { loadCart(); });
      });
    });
  }

  function loadCart() {
    fetch('/api/account/cart', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .then(function (data) { renderCart(data.items || []); });
  }

  function loadMe() {
    fetch('/api/account/me', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.user) {
          if (accountForms) { accountForms.classList.add('hidden'); accountForms.classList.remove('visible'); }
          if (accountDashboard) {
            accountDashboard.classList.add('visible');
            accountDashboard.style.display = 'block';
            if (dashboardEmail) dashboardEmail.textContent = data.user.email;
            var nameEl = document.getElementById('dashboard-name');
            var sinceEl = document.getElementById('dashboard-member-since');
            if (nameEl) nameEl.textContent = (data.user.name && data.user.name.trim()) ? data.user.name.trim() : '—';
            if (sinceEl && data.user.created_at) {
              var d = new Date(data.user.created_at);
              sinceEl.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
          }
          if (adminShortcut) adminShortcut.style.display = 'none';
          fetch('/api/admin/me', { credentials: 'include' })
            .then(function (r) { return r.ok ? r.json() : { admin: false }; })
            .then(function (a) { if (adminShortcut && a && a.admin) adminShortcut.style.display = 'flex'; })
            .catch(function () {});
          loadCart();
        } else {
          if (accountForms) { accountForms.classList.remove('hidden'); accountForms.classList.add('visible'); }
          if (accountDashboard) { accountDashboard.classList.remove('visible'); accountDashboard.style.display = 'none'; }
          if (cartContent) cartContent.innerHTML = '';
          if (adminShortcut) adminShortcut.style.display = 'none';
        }
      })
      .catch(function () {
        if (accountForms) { accountForms.classList.remove('hidden'); accountForms.style.display = 'block'; }
        if (accountDashboard) { accountDashboard.classList.remove('visible'); accountDashboard.style.display = 'none'; }
        if (adminShortcut) adminShortcut.style.display = 'none';
      });
  }

  function parseResponse(response) {
    return response.text().then(function (text) {
      var json = null;
      try { json = text ? JSON.parse(text) : null; } catch (e) {}
      return { ok: response.ok, status: response.status, json: json, text: text };
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMessage();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email, password: password })
      })
        .then(parseResponse)
        .then(function (res) {
          if (res.ok) { showMessage('Logged in.', 'success'); loadMe(); }
          else if (res.json && res.json.error) showMessage(res.json.error, 'error');
          else if (res.status === 404 || res.status === 0) showMessage('Account server is not running. Start it with: npm start', 'error');
          else showMessage(res.json ? res.json.error : 'Login failed. Try again.', 'error');
        })
        .catch(function () { showMessage('Cannot reach server. Start the FlowRing server with: npm start', 'error'); });
    });
  }

  if (formSignup) {
    formSignup.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMessage();
      var name = document.getElementById('signup-name').value.trim();
      var email = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name, email: email, password: password })
      })
        .then(parseResponse)
        .then(function (res) {
          var msg = (res.json && res.json.error) ? res.json.error : null;
          if (res.ok || res.status === 201) { showMessage('Account created. You are now logged in.', 'success'); loadMe(); }
          else if (msg) showMessage(msg, 'error');
          else if (res.status === 404 || res.status === 0) showMessage('Account server is not running. Start it with: npm start', 'error');
          else showMessage(msg || 'Sign up failed. Try again.', 'error');
        })
        .catch(function () { showMessage('Cannot reach server. Start the FlowRing server with: npm start', 'error'); });
    });
  }

  if (btnLogout) btnLogout.addEventListener('click', function () { fetch('/api/account/logout', { method: 'POST', credentials: 'include' }).then(function () { loadMe(); }); });

  function checkServer() {
    var banner = document.getElementById('server-check-banner');
    if (!banner) return;
    fetch('/api/account/me', { method: 'GET', credentials: 'include' })
      .then(function (r) {
        var isJson = (r.headers.get('content-type') || '').indexOf('application/json') !== -1;
        if (r.status === 501 || r.status === 404 || !isJson) banner.style.display = 'block';
      })
      .catch(function () { banner.style.display = 'block'; });
  }

  loadMe();
  checkServer();
})();
