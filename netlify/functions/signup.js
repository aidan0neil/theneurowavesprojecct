const fs = require('fs');
const path = require('path');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Netlify functions use a different path structure
const SIGNUPS_PATH = '/tmp/signups.csv'; // Use /tmp for serverless functions
const RELEASE_FORM_PATH = path.join(__dirname, '../../release-forms/release-form.pdf');

const CSV_HEADERS = [
  'Timestamp',
  'Race',
  'FirstName',
  'LastName',
  'Email',
  'Phone',
  'EmergencyContact',
  'EmergencyPhone',
  'ShirtSize',
  'WaiverAccepted',
];

function ensureCsvExists() {
  if (!fs.existsSync(SIGNUPS_PATH)) {
    fs.writeFileSync(SIGNUPS_PATH, CSV_HEADERS.join(',') + '\n', 'utf8');
  }
}

function escapeCsvField(value) {
  if (value == null || value === '') return '""';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return '"' + s + '"';
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: 'Method not allowed' }),
    };
  }

  try {
    ensureCsvExists();

    const body = JSON.parse(event.body);
    const race = body.race || 'Unknown';
    const row = [
      new Date().toISOString(),
      race,
      body.firstName ?? '',
      body.lastName ?? '',
      body.email ?? '',
      body.phone ?? '',
      body.emergencyContact ?? '',
      body.emergencyPhone ?? '',
      body.shirtSize ?? '',
      body.waiverAccepted === true || body.waiverAccepted === 'on' ? 'Yes' : 'No',
    ].map(escapeCsvField);

    fs.appendFileSync(SIGNUPS_PATH, row.join(',') + '\n', 'utf8');

    // Email functionality using Mailgun
    const emailEnabled = true; // Enable email for participant notifications
    
    // Send email to participant with liability waiver
    if (emailEnabled && body.email) {
      try {
        const mailgun = new Mailgun(formData);
        const mg = mailgun.client({
          username: 'api',
          key: process.env.MAILGUN_API_KEY
        });

        const emailData = {
          from: process.env.MAILGUN_FROM_EMAIL,
          to: body.email,
          subject: `NeuroWaves Marathon - Liability Waiver for ${race}`,
          text: `Thank you for registering for the ${race}! Please find your liability waiver attached. Complete it and bring it on race day.`,
          attachment: fs.createReadStream(RELEASE_FORM_PATH)
        };

        await mg.messages.create(process.env.MAILGUN_DOMAIN, emailData);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Continue even if email fails
      }
    }
    
    const message = emailEnabled
      ? 'Registration recorded. Thank you! Check your email for your release form—fill it out and bring it on race day.'
      : 'Registration recorded. Thank you! We\'ll be in touch with next steps. Please check your spam folder if nothing comes through to your inbox. Thank you!';

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message }),
    };

  } catch (err) {
    console.error('Signup write error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: 'Registration could not be saved. Please try again or contact us.' }),
    };
  }
};
