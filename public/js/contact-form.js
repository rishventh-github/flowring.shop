(function () {
  document.querySelectorAll('[data-contact-form]').forEach(function (form) {
    var status = form.querySelector('.contact-form__status');
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = form.querySelector('[name="name"]');
      var name = nameEl && nameEl.value ? String(nameEl.value).trim() : '';
      var interestEl = form.querySelector('[name="interest"]:checked');
      var interest = interestEl ? interestEl.value : '';
      var messageEl = form.querySelector('[name="message"]');
      var message = messageEl ? String(messageEl.value).trim() : '';
      var honeypotEl = form.querySelector('[name="website"]');
      var honeypot = honeypotEl && honeypotEl.value ? honeypotEl.value : '';

      if (!name) {
        setStatus('Please enter your name.', true);
        return;
      }
      if (!interest) {
        setStatus('Please choose Yes, Maybe, or No.', true);
        return;
      }

      if (btn) btn.disabled = true;
      setStatus('Sending…', false);

      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (controller) controller.abort();
      }, 15000);

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: name, interest: interest, message: message, website: honeypot }),
        signal: controller ? controller.signal : undefined
      })
        .then(function (r) {
          return r.text().then(function (text) {
            var data = {};
            if (text) {
              try {
                data = JSON.parse(text);
              } catch (err) {
                data = { error: text.slice(0, 180) };
              }
            }
            return { ok: r.ok, status: r.status, data: data };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            setStatus((res.data && res.data.error) || ('Could not send (HTTP ' + res.status + '). Please try again.'), true);
            return;
          }
          form.reset();
          setStatus(
            (res.data && res.data.message) || 'Thanks — your message was sent. I’ll follow up by email.',
            false
          );
        })
        .catch(function (err) {
          var aborted = err && err.name === 'AbortError';
          setStatus(
            aborted
              ? 'That took too long. Please refresh and try again (use the Vercel site if flowring.shop still points at Render).'
              : 'Network error. Please try again. If this keeps happening, open the site from your Vercel URL while DNS moves off Render.',
            true
          );
        })
        .then(function () {
          clearTimeout(timer);
          if (btn) btn.disabled = false;
        });
    });

    function setStatus(text, isError) {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle('is-error', !!isError);
    }
  });
})();
