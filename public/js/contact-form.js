(function () {
  document.querySelectorAll('[data-contact-form]').forEach(function (form) {
    var status = form.querySelector('.contact-form__status');
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.querySelector('[name="name"]') || {}).value;
      name = name ? String(name).trim() : '';
      var interestEl = form.querySelector('[name="interest"]:checked');
      var interest = interestEl ? interestEl.value : '';
      var messageEl = form.querySelector('[name="message"]');
      var message = messageEl ? String(messageEl.value).trim() : '';
      var honeypot = (form.querySelector('[name="website"]') || {}).value || '';

      if (!name) {
        setStatus('Please enter your name.', true);
        return;
      }
      if (!interest) {
        setStatus('Please choose Yes, Maybe, or No.', true);
        return;
      }

      btn.disabled = true;
      setStatus('Sending…', false);

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: name, interest: interest, message: message, website: honeypot })
      })
        .then(function (r) {
          return r.text().then(function (text) {
            var data = {};
            if (text) {
              try { data = JSON.parse(text); } catch (err) { data = { error: text.slice(0, 180) }; }
            }
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            setStatus((res.data && res.data.error) || 'Could not send. Please try again.', true);
            return;
          }
          form.reset();
          setStatus(
            (res.data && res.data.message) || 'Thanks — your message was sent. I’ll follow up by email.',
            false
          );
        })
        .catch(function () {
          setStatus('Network error. Please try again.', true);
        })
        .then(function () {
          btn.disabled = false;
        });
    });

    function setStatus(text, isError) {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle('is-error', !!isError);
    }
  });
})();
