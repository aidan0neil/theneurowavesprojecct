/**
 * Simple Netlify form handler for basic validation and success messages
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('signup-form');
    if (!form) return;

    var messageEl = document.getElementById('form-message');
    var submitBtn = form.querySelector('.btn-submit');

    form.addEventListener('submit', function (e) {
      if (!messageEl) return;

      // Basic validation
      var firstName = form.querySelector('[name="firstName"]')?.value?.trim() || '';
      var lastName = form.querySelector('[name="lastName"]')?.value?.trim() || '';
      var email = form.querySelector('[name="email"]')?.value?.trim() || '';
      var phone = form.querySelector('[name="phone"]')?.value?.trim() || '';
      var emergencyContact = form.querySelector('[name="emergencyContact"]')?.value?.trim() || '';
      var emergencyPhone = form.querySelector('[name="emergencyPhone"]')?.value?.trim() || '';
      var waiverAccepted = form.querySelector('[name="waiverAccepted"]')?.checked || false;

      if (!firstName || !lastName || !email || !phone || !emergencyContact || !emergencyPhone) {
        e.preventDefault();
        messageEl.textContent = 'Please fill in all required fields.';
        messageEl.className = 'message error';
        return;
      }

      if (!waiverAccepted) {
        e.preventDefault();
        messageEl.textContent = 'Please accept the waiver to continue.';
        messageEl.className = 'message error';
        return;
      }

      // Show submitting message
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }
      messageEl.textContent = 'Submitting...';
      messageEl.className = 'message';

      // Let Netlify handle the form submission naturally
    });
  });
})();
