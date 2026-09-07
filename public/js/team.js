(function () {
  'use strict';

  var API = window.FLOWRING_API || '/api';
  var grid = document.getElementById('team-grid');
  if (!grid) return;

  fetch(API + '/team')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (data) {
      var members = (data && data.members) ? data.members : [];
      if (!members.length) {
        grid.innerHTML = renderFallback();
        return;
      }
      grid.innerHTML = members.map(function (m) {
        var initials = escapeHtml((m.initials || '').trim() || deriveInitials(m.name || ''));
        var name = escapeHtml(m.name || '');
        var role = escapeHtml(m.role || '');
        var bio = escapeHtml(m.bio || '');
        var photo = (m.photo_url || '').trim();
        return (
          '<article class="team-card">' +
            '<div class="team-card__avatar" aria-hidden="true">' +
              (photo ? '<img class="team-card__photo" src="' + escapeAttr(photo) + '" alt="">' : '<span class="team-card__initials">' + initials + '</span>') +
            '</div>' +
            '<h3 class="team-card__name">' + name + '</h3>' +
            (role ? '<p class="team-card__role">' + role + '</p>' : '') +
            (bio ? '<p class="team-card__bio">' + bio + '</p>' : '') +
          '</article>'
        );
      }).join('');
    })
    .catch(function () {
      grid.innerHTML = renderFallback();
    });

  function deriveInitials(name) {
    return String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); })
      .join('') || '?';
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/\"/g, '&quot;').replace(/</g, '&lt;');
  }

  function renderFallback() {
    // If API is down, still show the primary team member.
    return (
      '<article class="team-card">' +
        '<div class="team-card__avatar" aria-hidden="true">' +
          '<img class="team-card__photo" src="images/rishventh-profile.png" alt="">' +
        '</div>' +
        '<h3 class="team-card__name">Rishventh Ramoshan</h3>' +
        '<p class="team-card__role">Founder</p>' +
        '<p class="team-card__bio">Building FlowRing — smart, simple water conservation for everyone.</p>' +
      '</article>'
    );
  }
})();

