/**
 * Registration form handler:
 * 1) Validate required fields
 * 2) POST to /api/signup
 * 3) Redirect to success page after API confirms save
 */
(function () {
  function urlEncode(data) {
    return Object.keys(data)
      .map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(data[key] ?? '');
      })
      .join('&');
  }

  function setMessage(messageEl, text, tone) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = tone ? 'message ' + tone : 'message';
  }

  function getPayload(form) {
    var payload = {};
    var formData = new FormData(form);
    formData.forEach(function (value, key) {
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });

    payload.waiverAccepted = form.querySelector('[name="waiverAccepted"]')?.checked || false;
    payload.race = payload.race || form.getAttribute('data-race') || '';
    return payload;
  }

  function setSubmittingState(submitBtn, isSubmitting, initialLabel) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Submitting…' : initialLabel;
  }

  async function submitToApi(payload) {
    var response = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    var result = {};
    try {
      result = await response.json();
    } catch (_) {
      // Fall back to generic error handling if JSON parsing fails.
    }

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'Registration could not be saved in the API.');
    }

    return result;
  }

  async function submitToNetlifyForm(form, payload) {
    var netlifyPayload = Object.assign({}, payload, {
      'form-name': form.getAttribute('name') || payload['form-name'] || 'signup',
      'bot-field': payload['bot-field'] || '',
    });

    var response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: urlEncode(netlifyPayload),
    });

    if (!response.ok) {
      throw new Error('Registration could not be saved in Netlify Forms.');
    }

    return { ok: true };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('signup-form');
    if (!form) return;

    var messageEl = document.getElementById('form-message');
    var submitBtn = form.querySelector('.btn-submit');
    var initialSubmitLabel = submitBtn ? submitBtn.textContent : 'Submit registration';

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      setMessage(messageEl, '', '');

      if (!form.checkValidity()) {
        form.reportValidity();
        setMessage(messageEl, 'Please fill in all required fields.', 'error');
        return;
      }

      var waiverAccepted = form.querySelector('[name="waiverAccepted"]')?.checked || false;
      if (!waiverAccepted) {
        setMessage(messageEl, 'Please accept the waiver to continue.', 'error');
        return;
      }

      var payload = getPayload(form);
      setSubmittingState(submitBtn, true, initialSubmitLabel);
      setMessage(messageEl, 'Submitting registration...', '');

      try {
        var writers = [];
        if (form.hasAttribute('data-netlify')) {
          writers.push(submitToNetlifyForm(form, payload));
        }
        writers.push(submitToApi(payload));

        var results = await Promise.allSettled(writers);
        var hasSuccess = results.some(function (entry) {
          return entry.status === 'fulfilled';
        });

        if (!hasSuccess) {
          var firstFailure = results.find(function (entry) {
            return entry.status === 'rejected';
          });
          throw firstFailure?.reason || new Error('Registration could not be saved. Please try again.');
        }

        var apiSuccess = results.find(function (entry) {
          return entry.status === 'fulfilled' && entry.value && entry.value.message;
        });
        var successMessage = apiSuccess?.value?.message || 'Registration recorded! Redirecting...';
        setMessage(messageEl, successMessage, 'success');
        window.location.assign('/signup-success.html');
      } catch (error) {
        setSubmittingState(submitBtn, false, initialSubmitLabel);
        setMessage(
          messageEl,
          error?.message || 'Network error while submitting. Please try again.',
          'error'
        );
      }
    });
  });
})();
