/**
 * Netlify-native form handling:
 * - keep browser/native Netlify POST submission
 * - provide lightweight validation feedback
 * - disable submit button to prevent double submits
 */
(function () {
  function setMessage(messageEl, text, tone) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = tone ? 'message ' + tone : 'message';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('signup-form');
    if (!form) return;

    var messageEl = document.getElementById('form-message');
    var submitBtn = form.querySelector('.btn-submit');

    form.addEventListener('submit', function (e) {
      setMessage(messageEl, '', '');

      if (!form.checkValidity()) {
        form.reportValidity();
        setMessage(messageEl, 'Please fill in all required fields.', 'error');
        e.preventDefault();
        return;
      }

      var waiverAccepted = form.querySelector('[name="waiverAccepted"]')?.checked || false;
      if (!waiverAccepted) {
        setMessage(messageEl, 'Please accept the waiver to continue.', 'error');
        e.preventDefault();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }
      setMessage(messageEl, 'Submitting registration...', '');
      // Do not call preventDefault here: allow native Netlify form submission.
    });
  });
})();
