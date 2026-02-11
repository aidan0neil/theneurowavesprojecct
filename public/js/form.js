/**
 * Shared sign-up form handler for Netlify Forms.
 * Uses Netlify's built-in form handling instead of custom API.
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('signup-form');
    if (!form) return;

    var race = form.getAttribute('data-race') || 'Unknown';
    var messageEl = document.getElementById('form-message');
    var submitBtn = form.querySelector('.btn-submit');

    // Add race field to form if not present
    var raceField = form.querySelector('input[name="race"]');
    if (!raceField) {
      var hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'race';
      hiddenInput.value = race;
      form.appendChild(hiddenInput);
    }

    form.addEventListener('submit', function (e) {
      // Don't prevent default - let Netlify handle the form submission
      if (!messageEl) return;

      messageEl.textContent = '';
      messageEl.className = 'message';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }

      // Validate required fields
      var firstName = form.querySelector('[name="firstName"]')?.value?.trim() || '';
      var lastName = form.querySelector('[name="lastName"]')?.value?.trim() || '';
      var email = form.querySelector('[name="email"]')?.value?.trim() || '';
      var phone = form.querySelector('[name="phone"]')?.value?.trim() || '';
      var emergencyContact = form.querySelector('[name="emergencyContact"]')?.value?.trim() || '';
      var emergencyPhone = form.querySelector('[name="emergencyPhone"]')?.value?.trim() || '';
      var waiverAccepted = form.querySelector('[name="waiverAccepted"]')?.checked || false;

      if (!firstName || !lastName || !email || !phone || !emergencyContact || !emergencyPhone) {
        messageEl.textContent = 'Please fill in all required fields.';
        messageEl.className = 'message error';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit registration';
        }
        return;
      }

      if (!waiverAccepted) {
        messageEl.textContent = 'Please accept the waiver to continue.';
        messageEl.className = 'message error';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit registration';
        }
        e.preventDefault(); // Prevent submission if validation fails
        return;
      }

      // Show success message and let Netlify handle the rest
      messageEl.textContent = 'Submitting...';
      messageEl.className = 'message';
      // Let the form submit normally to Netlify
    });
  });
})();
