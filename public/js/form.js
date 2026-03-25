/**
 * Registration form handler:
 * 1) Validate required fields
 * 2) POST to /api/signup
 * 3) Redirect to success page after API confirms save
 */
(function () {
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
          // If JSON parsing fails, fall through to generic error handling.
        }

        if (!response.ok || !result.ok) {
          throw new Error(result.message || 'Registration could not be saved. Please try again.');
        }

        setMessage(messageEl, result.message || 'Registration recorded! Redirecting...', 'success');
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
