/**
 * Shared sign-up form handler for custom API.
 * Sends data to /api/signup endpoint for email processing.
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
      e.preventDefault(); // Prevent default to use fetch
      if (!messageEl) return;

      messageEl.textContent = '';
      messageEl.className = 'message';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }

      // Send data to custom API endpoint
      var body = {
        race: race,
        firstName: form.querySelector('[name="firstName"]')?.value?.trim() || '',
        lastName: form.querySelector('[name="lastName"]')?.value?.trim() || '',
        email: form.querySelector('[name="email"]')?.value?.trim() || '',
        phone: form.querySelector('[name="phone"]')?.value?.trim() || '',
        emergencyContact: form.querySelector('[name="emergencyContact"]')?.value?.trim() || '',
        emergencyPhone: form.querySelector('[name="emergencyPhone"]')?.value?.trim() || '',
        shirtSize: form.querySelector('[name="shirtSize"]')?.value || '',
        waiverAccepted: form.querySelector('[name="waiverAccepted"]')?.checked || false,
      };

      // Validate required fields
      if (!body.firstName || !body.lastName || !body.email || !body.phone || !body.emergencyContact || !body.emergencyPhone) {
        messageEl.textContent = 'Please fill in all required fields.';
        messageEl.className = 'message error';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit registration';
        }
        return;
      }

      if (!body.waiverAccepted) {
        messageEl.textContent = 'Please accept the waiver to continue.';
        messageEl.className = 'message error';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit registration';
        }
        return;
      }

      fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.message || 'Registration failed');
            return data;
          });
        })
        .then(function (data) {
          messageEl.textContent = 'Thank you! Your registration has been recorded. We\'ll be in touch with next steps. Please check your spam folder if nothing comes through to your inbox. Thank you!';
          messageEl.className = 'message success';
          form.reset();
        })
        .catch(function (err) {
          messageEl.textContent = err.message || 'Something went wrong. Please try again or contact us.';
          messageEl.className = 'message error';
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit registration';
          }
        });
    });
  });
})();
